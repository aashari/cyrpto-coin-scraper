resource "random_string" "aws_sqs_queue_archival_postfix" {
  length  = 16
  special = false
}

locals {
  sqs_archival_name = format("%s-archival-%s", var.service_name, random_string.aws_sqs_queue_archival_postfix.result)
}

resource "aws_sqs_queue" "archival" {
  name                       = local.sqs_archival_name
  delay_seconds              = 0
  max_message_size           = 32768
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 0
  visibility_timeout_seconds = 120
}
