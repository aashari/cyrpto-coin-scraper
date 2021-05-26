resource "random_string" "aws_sns_topic_price_notification_postfix" {
  length  = 16
  special = false
}

locals {
  sns_pirce_notification_name = format("%s-price-notification-%s", var.service_name, random_string.aws_sns_topic_price_notification_postfix.result)
}

resource "aws_sns_topic" "price_notification" {
  name = local.sns_pirce_notification_name
}