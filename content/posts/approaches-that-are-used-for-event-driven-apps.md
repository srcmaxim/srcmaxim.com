---
title: "Approaches that are used for event-driven apps"
date: 2020-10-10
draft: true
---

Event-Driven architecture is a widely popular distributed streaming platform that thousands of companies like New Relic, Uber, and Square use to build scalable, high-throughput, and reliable real-time streaming systems. 

In this article, I'd like to note approaches that are used for event-driven applications based on Kafka distributed streaming platform.

## Microservices patterns overview 

### Pattern: Messaging
Services must handle requests from the application’s clients. Furthermore, services often collaborate to handle those requests. Consequently, they must use an inter-process communication protocol.

Services often need to collaborate. Synchronous communicate results in tight runtime coupling, both the client and service must be available for the duration of the .

Use asynchronous messaging for inter-service communication. Services communicating by exchanging messages over messaging channels.

There are several different styles of asynchronous communication:

- Request/response - a service sends a request message to a recipient and expects to receive a reply message promptly
- Notifications - a sender sends a message a recipient but does not expect a reply. Nor is one sent.
- Request/asynchronous response - a service sends a request message to a recipient and expects to receive a reply message eventually
- Publish/subscribe - a service publishes a message to zero or more recipients
- Publish/asynchronous response - a service publishes a request to one or recipients, some of whom send back a reply

### Pattern: Idempotent consumer

Implement an idempotent consumer, which is a message consumer that can cope with being invoked multiple times with the same message. Some consumers are naturally idempotent. Others must track the messages that they have processed in order to detect and discard duplicates.

### Pattern: Remote Procedure Invocation

How do services in a microservice architecture communicate? Use RPI for inter-service communication. The client uses a request/reply-based protocol to make requests to a service.
There are numerous examples of RPI technologies:
- REST
- gRPC

This pattern has the following benefits:
- Simple and familiar
- Request/reply is easy
- Simpler system since there in no intermediate broker

This pattern has the following drawbacks:
- Usually only supports request/reply and not other interaction patterns such as notifications, request/async response, publish/subscribe, publish/async response
- Reduced availability since the client and the service must be available for the duration of the interaction

For serving async responses you can use websocket with data sources (if data is larger, `AWS Websocket API Gateway` has a limit of 256Kb per message). You can use Regis or S3 as a data source. Also you need to write some logic for reading and writing to data source. 

### Pattern: Transactional outbox

A service command typically needs to update the database and send messages/events. For example, a service that participates in a saga needs to atomically update the database and sends messages/events. Similarly, a service that publishes a domain event must atomically update an aggregate and publish an event. The database update and sending of the message must be atomic in order to avoid data inconsistencies and bugs. However, it is not viable to use a distributed transaction that spans the database and the message broker to atomically update the database and publish messages/events.

A service that uses a relational database inserts messages/events into an outbox table (e.g. MESSAGE) as part of the local transaction. An service that uses a NoSQL database appends the messages/events to attribute of the record (e.g. document or item) being updated. A separate Message Relay process publishes the events inserted into database to a message broker.

This pattern has the following benefits:
- The service publishes high-level domain events
- No 2PC required

This pattern has the following drawbacks:
- Potentially error prone since the developer might forget to publish the message/event after updating the database.

### Pattern: Transaction log tailing

How to publish messages/events into the outbox in the database to the message broker?
Tail the database transaction log and publish each message/event inserted into the outbox to the message broker. The mechanism for trailing the transaction log depends on the database:
- Postgres WAL
- AWS DynamoDB table streams

This pattern has the following benefits:
- No 2PC
- Guaranteed to be accurate

This pattern has the following drawbacks:
- Relatively obscure although becoming increasing common
- Requires database specific solutions
- Tricky to avoid duplicate publishing

You can use [Debezium](https://github.com/debezium/debezium) as a distributed platform for change data capture. Start it up, point it at your databases, and your apps can start responding to all of the inserts, updates, and deletes that other apps commit to your databases.

### Pattern: Transaction polling publisher

How to publish messages/events into the outbox in the database to the message broker?
Publish messages by polling the database’s outbox table.

This pattern has the following benefits:
- Works with any SQL database
- This pattern has the following drawbacks:

Tricky to publish events in order
- Not all NoSQL databases support this pattern

## Schema Registry for Kafka

### Schema Registry 

Confluent Schema Registry provides a serving layer for your metadata. It provides a RESTful interface for storing and retrieving your Avro®, JSON Schema, and Protobuf schemas. It stores a versioned history of all schemas based on a specified subject name strategy, provides multiple compatibility settings and allows evolution of schemas according to the configured compatibility settings and expanded support for these schema types. It provides serializers that plug into Apache Kafka® clients that handle schema storage and retrieval for Kafka messages that are sent in any of the supported formats.

Schema Registry lives outside of and separately from your Kafka brokers. Your producers and consumers still talk to Kafka to publish and read data (messages) to topics. Concurrently, they can also talk to Schema Registry to send and retrieve schemas that describe the data models for the messages.

### Apache Avro schema

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

You can found [code examples](https://github.com/srcmaxim/kafka-avro-integration-test) in my Github.

## Best practices for topic creation 

Topic configurations have a tremendous impact on the performance of Kafka clusters. Because alterations to settings such as replication factor or partition count can be challenging, you’ll want to set these configurations the right way the first time, and then simply create a new topic if changes are required (always be sure to test out new topics in a staging environment).

### How to create topics in the right way

It is highly recommended not to use auto topic create for Streams, but to manually create all input/output topics before you start your Streams application.

The topic configurations have a ‘server default’ property. These can be overridden at the point of topic creation or at later time in order to have topic-specific configuration.

The example demonstrates topic creation from the console with a replication-factor of two and six partitions:

- In Spring you should have `KafkaAdmin` bean in place to set up topics. Consider using `Topic` and `NewTopic` instead of using `Strign` for a topic key. If you have some other kind of application, you can run an initial script that calls `bin/kafka-topics.sh` before starting your application or after Kafka setup.
```java
@Bean
public NewTopic topic1() {
    return TopicBuilder.name("thing1")
            .partitions(6)
            .replicas(2)
            .build();
}
```
- In Kafka, set up the following props to enable dynamic topics creation:
```properties
auto.create.topics.enable=true
delete.topic.enable=false
default.replication.factor=12
num.partitions=2
```

### Use partitions for Kafka even inside integration tests

It's hard to spot some bugs that can be seen only in production when `partitions` isn't set properly. Use the same config for topics for prod and test environments.

```java
@Bean
public NewTopic topic1() {
    return TopicBuilder.name("thing1")
            .partitions(6)
            .replicas(2)
            .build();
}
```

### Message should be approximatelly 1Mb in size

## TopologyTestDriver

A tool for showing how Kafka processes data. 

[TopologyTestDriver](https://github.com/apache/kafka/blob/trunk/streams/test-utils/src/main/java/org/apache/kafka/streams/TopologyTestDriver.java) makes it easier to write tests to verify the behavior of topologies of Kafka Streams. You can test simple topologies that have a single processor, or very complex topologies that have multiple sources, processors, sinks, or sub-topologies.

The test-utils package provides a [TopologyTestDriver](https://www.confluent.io/blog/testing-kafka-streams/) that can be used to pipe data through a Topology that is either assembled manually using Processor API or via the DSL using StreamsBuilder. The test driver simulates the library runtime that continuously fetches records from input topics and processes them by traversing the topology. 

You can use TopologyTestDriver in tests as code or converts an ASCII Kafka Topology description into a hand drawn diagram: https://zz85.github.io/kafka-streams-viz/. 

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

## Process big files with Kafka

Originally, Kafka was not built for processing large messages and files. This does not mean that you cannot do it!

Kafka limits the max size of messages. The default value of the broker configuration' ' message.max.bytes' is 1MB.

LinkedIn talked a long time ago about the pros and cons of two different approaches: Using 'Kafka only' vs. 'Kafka in conjunction with another data storage'. Especially outside the public cloud, most enterprises cannot simply use an S3 object store for big data.

There are basically 2 types of implementation:
- Chunking -- data is divided into chunks and then connected upon receiving
- External Store -- data is stored outside of Kafka in Object Storage(S3)

### Chunking

The one way to send large messages is to slice and dice them. Use the producing client to split the message into small 10K portions, use partition key to make sure all the portions will be sent to the same Kafka partition (so the order will be preserved) and have the consuming client sew them back up into a large message.

If you need to send larger payloads, but their size is still bounded, you can increase that limit in the broker and producer configuration (message.max.bytes in broker configs and max.request.size in producer configs). 10MB should still be a reasonable limit.

Linkedin maintains (java) kafka clients (https://github.com/linkedin/li-apache-kafka-clients) that are capable of fragmenting large messages on the producer and reassembling them on the consumer, but the solution is imperfect:

- Does not work properly with log-compacted kafka topics
- Has memory overhead on the consumer for re-assembly and storage of fragments

### External Store

The best way to send large messages is not to send them at all. If shared storage is available (NAS, HDFS, S3), placing large files on the shared storage and using Kafka just to send a message about the file’s location is a much better use of Kafka.

Kafka producer can be used to compress messages. If the original message is XML, there’s a good chance that the compressed message will not be very large at all. Use compression.codec and compressed.topics configuration parameters in the producer to enable compression. GZip and Snappy are both supported.

In addition, you need to know how exactly you need to store your data:

- if S3 versioning is enabled, and files are stored with versions use MD5 hash alongside S3 key name for event, you will receive exactly the same file as you saved in S3. That's because S3 has eventual consistency for PUTs of existing files. 
- if random files are stored, you don't have to store MD5 hash in event

Handling transactions for S3 writes can be archived in 2 ways:
- write AWS Lambda that is triggered upon receiving `S3:write` event
- commit Kafka event after receiving 200 OK from S3

Handling transactions for S3 file processing. Reading and writing files to Kafka in one transaction can slow down your pipeline significantly. Better approach is to use [AWS Step Function](https://aws.amazon.com/step-functions) for handling S3 file processing. Generally it's a more scalable solution.

AWS Step Function makes it easy to sequence AWS Lambda functions and multiple AWS services. You can create and run a series of checkpointed and event-driven workflows that maintain the application state. The output of one step acts as an input to the next. Each step in your application executes in order. 
