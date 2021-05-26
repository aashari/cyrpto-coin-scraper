
# Crypto Coin Scraper

## Background

This project aimed to provide the infrastructure to scrap and store cyrpto coin data such as price and trades information, for the initial implementation, this project collects data from bitcoin.co.id API to collect the price and trades information every second

This project contains Terraform IaC (Infrastructure as Code) to deploy the stacks on AWS cloud provider

## Design Implementation

![Architecture Diagram](Architecture%20Diagram.png)

* For initial implementation we only have 1 single data sources which is bitcoin.co.id API
* We are using AWS Lambda for the scraper (AWS Lambda Data Scraper) that scheduled run every 1 minutes to run and collect the price and trades data, the Lambda will run the scripts that continuosly scrape the data every single second
* Data collected by AWS Lambda Data Scraper will be sent to Amazon SQS every minutes and also will be sent the price data to Amazon SNS for the near-real-time price notification every 10 seconds
* We have Amazon SNS Data Notification, this SNS will receive price data every 10 seconds from AWS Lambda Data Scraper, we can integrate any possible component to this SNS to listen the near-real-time price update
* We have AWS Lambda for the archival (AWS Lambda Data Archival), this Lambda will receive price data and trades data of crypto coin and store it to the final storage destination (S3 Bucket)
* We have S3 Bucket to to store the data collected (Price and Trades)

### Total Cost Estimation
Based on actual testing for 72 hours of running the stacks, here is the usage that collected from this stacks (deployed in ap-southeast-1):

#### AWS Lambda Data Scraper
|Description|Amount|Unit|Duration|
|--|--|--|--|
|Number of request| 7,647 |request|daily|
|Duration of each request | 50,500 |ms|@request|
|Memory Allocated | 256 |MB||

Unit conversions
-   Amount of memory allocated: 256 MB x 0.0009765625 GB in a MB = 0.25 GB

Pricing calculations
-   229,410 requests x 50,500 ms x 0.001 ms to sec conversion factor = 11,585,205.00 total compute (seconds)
-   0.25 GB x 11,585,205.00 seconds = 2,896,301.25 total compute (GB-s)
-   2,896,301.25 GB-s x 0.0000166667 USD = 48.27 USD (monthly compute charges)
-   229,410 requests x 0.0000002 USD = 0.05 USD (monthly request charges)
-   48.27 USD + 0.05 USD = 48.32 USD
-   **Lambda costs - Without Free Tier (monthly): 48.32 USD**

#### AWS Lambda Data Archival
|Description|Amount|Unit|Duration|
|--|--|--|--|
|Number of request| 14,305 |request|daily|
|Duration of each request | 3,478 |ms|@request|
|Memory Allocated | 256 |MB||

Unit conversions
-   Amount of memory allocated: 256 MB x 0.0009765625 GB in a MB = 0.25 GB

Pricing calculations
-   14,305 requests x 3,478 ms x 0.001 ms to sec conversion factor = 49,752.79 total compute (seconds)
-   0.25 GB x 49,752.79 seconds = 12,438.20 total compute (GB-s)
-   12,438.20 GB-s x 0.0000166667 USD = 0.21 USD (monthly compute charges)
-   14,305 requests x 0.0000002 USD = 0.00 USD (monthly request charges)
-   **Lambda costs - Without Free Tier (monthly): 0.21 USD**

#### SQS Data Queue
|Description|Amount|Unit|Duration|
|--|--|--|--|
|Standard queue requests| 14,305 |request|daily|
-   0.42915 requests per month x 1000000 multiplier for million = 429,150.00 total standard queue requests
-   Tiered price for: 429150.00 requests
-   429150 requests x 0.0000004000 USD = 0.17 USD
-   Total tier cost = 0.1717 USD (Standard queue requests cost)
-   **Total SQS cost (monthly): 0.17 USD**

#### SNS Data Notification
|Description|Amount|Unit|Duration|
|--|--|--|--|
|Number of request| 57,334 |request|daily|
-   1.72002 requests x 0.0000005 USD x 1000000 multiplier for million = 0.86001 USD (SNS requests cost)
-   **SNS Requests and Notifications cost (monthly): 0.86 USD**

#### S3 Bucket Data Storage
|Description|Amount|Unit|Duration|
|--|--|--|--|
|Write Object| 14,305 |request|daily|
|Get Object| 14,305 |request|daily|
> Notes: daily storage size will increase about 50% by previous day

-   Tiered price for: 10 GB
-   10 GB x 0.0250000000 USD = 0.25 USD
-   Total tier cost = 0.2500 USD (S3 Standard storage cost)
-   429,150 PUT requests for S3 Storage x 0.000005 USD per request = 2.1458 USD (S3 Standard PUT requests cost)
-   429,150 GET requests in a month x 0.0000004 USD per request = 0.1717 USD (S3 Standard GET requests cost)
-   0.25 USD + 0.1717 USD + 2.1458 USD = 2.57 USD (Total S3 Standard Storage, data requests, S3 select cost)
-   **S3 Standard cost (monthly): 2.57 USD**

---
Total monthly: **52.13 USD**

## Area of Improvement
As we can see, costly component is a Lambda Data Scraper, we can potentially move this item into EC2 instances to deploy the scraping script to run periodically to scrap the data

## How to Use 
- Clone this repository into your local machine
- You can create `terraform.tfvars` to modify the value of `variables.tf`
- Run terraform init
- Run terraform apply