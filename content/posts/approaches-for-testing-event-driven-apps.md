---
title: "Approaches for testing event-driven apps"
date: 2020-10-10
draft: false
---

## Introdunction
Event-driven apps mean that one part of the application keeps producing records to a topic and another part of the application keeps consuming the records and continuously processes them based on business rules. 

The records, partitions, offsets, exception scenarios, etc. keep on changing, making it difficult to think in terms of what to test, when to test, and how to test.

In this article, I describe basic approaches for testing microservice applications built using Kafka. 

## Consumer-driven contract test

Evolving a community of service providers and consumers provides coupling issues that arise when service providers change parts of their contract, particularly document schemas, and identifies two well-understood strategies - adding schema extension points and performing "just enough" validation of received messages - for mitigating such issues. [See consumer-driven contract from Martin Fovler](https://www.martinfowler.com/articles/consumerDrivenContracts.html).

Consumer-driven contracts are an essential part of a mature microservice testing, enabling independent service deployments. But in addition, I want to point out that consumer-driven contract testing is a technique and an attitude that requires no special tool to implement.

When two independently developed services are collaborating, changes to the supplier’s API can cause failures for all its consumers. Consuming services usually cannot test against live suppliers since such tests are slow and brittle, so it’s best to use Test Doubles, leading to the danger that the test doubles get out of sync with the real supplier service. Consumer teams can protect themselves from these failures by using [integration contract tests](https://martinfowler.com/bliki/ContractTest.html) – tests that compare actual service responses with test values.

## Using Apache Avro for Consumer-driven testing

If you are starting fresh with Kafka, you’ll have the format of your choice. So which is best? There are many criteria here: efficiency, ease of use, support in different programming languages, and so on. In our own use we have found Apache Avro to be one of the better choices for stream data.

Avro is an open source data serialization system that helps with data exchange between systems, programming languages, and processing frameworks. Avro helps define a binary format for your data, as well as map it to the programming language of your choice.

Avro is the best choice for a number of reasons:

1. It has a direct mapping to and from JSON
2. It has a very compact format. The bulk of JSON, repeating every field name with every single record, is what makes JSON inefficient for high-volume usage.
3. It is very fast.
4. It has great bindings for a wide variety of programming languages so you can generate Java objects that make working with event data easier, but it does not require code generation so tools can be written generically for any data stream.
5. It has a rich, extensible schema language defined in pure JSON
6. It has the best notion of compatibility for evolving your data over time.

The schemas end up serving a number of critical purposes:

They let the producers or consumers of data streams know the right fields are need in an event and what type each field is.
They document the usage of the event and the meaning of each field in the “doc” fields.
They protect downstream data consumers from malformed data, as only valid data will be permitted in the topic.

Here is an example of `User` schema: `user.avsc`.
```json
{
  "namespace": "com.srcmaxim.events",
  "type": "record",
  "name": "User",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "avro.java.string": "String"
    },
    {
      "name": "age",
      "type": "int"
    }
  ]
}
```

It will create the following class:

```java
@AvroGenerated
public class User extends SpecificRecordBase implements SpecificRecord {
    private static final long serialVersionUID = -8701450327227285572L;
    public static final Schema SCHEMA$ = (new Parser()).parse("{\"type\":\"record\",\"name\":\"User\",\"namespace\":\"com.srcmaxim.events\",\"fields\":[{\"name\":\"name\",\"type\":\"string\",\"avro.java.string\":\"String\"},{\"name\":\"age\",\"type\":\"int\"}]}");
    private static SpecificData MODEL$ = new SpecificData();
    private static final BinaryMessageEncoder<User> ENCODER;
    private static final BinaryMessageDecoder<User> DECODER;
    private CharSequence name;
    private int age;
    private static final DatumWriter<User> WRITER$;
    private static final DatumReader<User> READER$;

    public static Schema getClassSchema(){...}
    public static BinaryMessageEncoder<User> getEncoder(){...}
    public static BinaryMessageDecoder<User> getDecoder(){...}
    public static BinaryMessageDecoder<User> createDecoder(SchemaStore resolver){...}
    public ByteBuffer toByteBuffer() throws IOException {...}
    public static User fromByteBuffer(ByteBuffer b) throws IOException {...}
    
    // Class constructors
    public User() {}
    public User(CharSequence name, Integer age) {
        this.name = name;
        this.age = age;
    }

    // Metadata
    public SpecificData getSpecificData() {...}
    public Schema getSchema() {...}

    // get by field N
    public Object get(int field$) {...}
    // put by field N
    public void put(int field$, Object value$) {...}

    // POJO methods
    public CharSequence getName() {...}
    public void setName(CharSequence value) {...}
    public int getAge() {...}
    public void setAge(int value) {...}

    // Builder
    public static User.Builder newBuilder() {...}
    public static User.Builder newBuilder(User.Builder other) {...}
    public static User.Builder newBuilder(User other) {...}
    @AvroGenerated
    public static class Builder extends SpecificRecordBuilderBase<User> implements RecordBuilder<User> {...}

    // Data read/write and encode/decode
    public void writeExternal(ObjectOutput out) throws IOException {...}
    public void readExternal(ObjectInput in) throws IOException {...}
    protected boolean hasCustomCoders() {...}
    public void customEncode(Encoder out) throws IOException {...}
    public void customDecode(ResolvingDecoder in) throws IOException{...}

}
```

You can found [code examples](https://github.com/srcmaxim/kafka-avro-integration-test) in my Github.

## Integratio tests using Kafka and Schema Registry

Apache Kafka producers write data to Kafka topics and Kafka consumers read data from Kafka topics. There is an implicit “contract” that producers write data with a schema that can be read by consumers, even as producers and consumers evolve their schemas. Schema Registry helps ensure that this contract is met with compatibility checks.

It is useful to think about schemas as APIs. Applications depend on APIs and expect any changes made to APIs are still compatible and applications can still run. Similarly, streaming applications depend on schemas and expect any changes made to schemas are still compatible and they can still run.

You can use [liblary](https://github.com/gAmUssA/testcontainers-java-module-confluent-platform) based on top of TestContainers and Docker to run Kafka with Confluent Schema Registry.

You could write `AbstractIntegrationTest` for testing that starts Kafka and Schema Registry. 

```java
@Slf4j
@ActiveProfiles("test")
@RunWith(SpringJUnit4ClassRunner.class)
@SpringBootTest(classes = KafkaWorkshopApplication.class)
public abstract class AbstractIntegrationTest {

    // todo: add random filepath for kafka to mitigate different OS paths issues 
    public static KafkaContainer kafka = new KafkaContainer("5.5.1")
            .withLogConsumer(new Slf4jLogConsumer(log))
            .withNetwork(Network.newNetwork());

    public static SchemaRegistryContainer schemaRegistry = new SchemaRegistryContainer("5.5.1")
            .withLogConsumer(new Slf4jLogConsumer(log));

    @BeforeClass
    public static void prep() {
        kafka.start();
        schemaRegistry.withKafka(kafka).start();
    }

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.properties.bootstrap.servers", kafka::getBootstrapServers); 1️⃣
        registry.add("spring.kafka.properties.schema.registry.url", schemaRegistry::getSchemaRegistryUrl); 2️⃣
        registry.add("spring.kafka.consumer.properties.auto.offset.reset", () -> "earliest"); 3️⃣
    }

}
```

>1️⃣ Add Kafka Bootstrap Servers to Spring properties at the runtime
2️⃣ Add Schema Registry URL to Spring properties at the runtime
3️⃣ Each test case will have all data from the start of the topic 

Then for writing tests you need to extend `AbstractIntegrationTest`.

```java
@ExtendWith(SpringExtension.class)
class KafkaWorkshopApplicationTests extends AbstractIntegrationTest {

    @Value("${com.srcmaxim.topic.name}")
    private String topicName;

    @Autowired
    KafkaProperties properties;

    @Test
    void contextLoads() {

        // kafka consumer
        final Consumer<String, Object> consumer = createConsumer(topicName);
        // consumer read all messages

        final ArrayList<Object> actualValues = new ArrayList<>();
        while (true) {
            final ConsumerRecords<String, Object> records = KafkaTestUtils.getRecords(consumer, 10000);
            if (records.isEmpty()) {
                break;
            }
            records.forEach(stringStringConsumerRecord -> actualValues.add(stringStringConsumerRecord.value()));
        }

        // fixture
        final ArrayList<User> ours = new ArrayList<>();
        IntStream.range(0, 10).forEach(i -> {
            User e = new User("username" + i, i); 1️⃣
            ours.add(e);
        });

        assertEquals(ours, actualValues);
    }

    private Consumer<String, Object> createConsumer(final String topicName) {
        Map<String, Object> consumerProperties = properties.buildConsumerProperties(); 2️⃣
        KafkaAvroDeserializer avroDeser = new KafkaAvroDeserializer();
        avroDeser.configure(consumerProperties, false);
        final ConsumerFactory<String, Object> consumerFactory = new DefaultKafkaConsumerFactory<>(consumerProperties, new StringDeserializer(), avroDeser); 3️⃣
        final Consumer<String, Object> consumer = consumerFactory.createConsumer();
        consumer.subscribe(Collections.singletonList(topicName));
        return consumer;
    }

}
```

>1️⃣ Class `User` comes from a liblary that uses Apache Avro as a source for creating Java Objects
2️⃣ KafkaProperties hold specific props for Kafka and methods for creating props for `Consumer` and `Producer`  
3️⃣ `DefaultKafkaConsumerFactory` uses plain `StringDeserializer` on top of `KafkaAvroDeserializer` although other binary formats is supported

You can find [code examples](https://github.com/srcmaxim/kafka-avro-integration-test) in my Github.

## TopologyTestDriver

A tool for showing how Kafka processes data. 

[TopologyTestDriver](https://github.com/apache/kafka/blob/trunk/streams/test-utils/src/main/java/org/apache/kafka/streams/TopologyTestDriver.java) makes it easier to write tests to verify the behavior of topologies of Kafka Streams. You can test simple topologies that have a single processor, or very complex topologies that have multiple sources, processors, sinks, or sub-topologies.

The test-utils package provides a [TopologyTestDriver](https://www.confluent.io/blog/testing-kafka-streams/) that can be used to pipe data through a Topology that is either assembled manually using Processor API or via the DSL using StreamsBuilder. The test driver simulates the library runtime that continuously fetches records from input topics and processes them by traversing the topology. 

You can use TopologyTestDriver in tests as a code or converts an ASCII Kafka Topology description into a hand drawn diagram: https://zz85.github.io/kafka-streams-viz/. 

```
Topology
Sub-topologies:
Sub-topology: 0
	Source:  KSTREAM-SOURCE-0000000000 (topics: [conversation-meta])
	--> KSTREAM-TRANSFORM-0000000001
	Processor: KSTREAM-TRANSFORM-0000000001 (stores: [conversation-meta-state])
	--> KSTREAM-KEY-SELECT-0000000002
	<-- KSTREAM-SOURCE-0000000000
	Processor: KSTREAM-KEY-SELECT-0000000002 (stores: [])
	--> KSTREAM-FILTER-0000000005
	<-- KSTREAM-FILTER-0000000005
Sub-topology: 1
	Source: KSTREAM-SOURCE-0000000006 (topics: [count-resolved-repartition])
	--> KSTREAM-AGGREGATE-0000000003
	Processor: KSTREAM-AGGREGATE-0000000003 (stores: [count-resolved])
	--> KTABLE-TOSTREAM-0000000007
	<-- KTABLE-TOSTREAM-0000000007
```

## Code Examples

1 [Example of usage Gradle Avro Plugin, Kafka and Schema Registry for integration testing](https://github.com/srcmaxim/kafka-avro-integration-test)
2 [Tests for Kafka and Schema Registry testcontainers](https://github.com/srcmaxim/kafka-schema-registry-testcontainers)
