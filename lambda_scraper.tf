resource "random_string" "lambda_scraper_name" {
  length  = 16
  special = false
}

locals {
  lambda_scraper_name = format("%s-scraper-%s", var.service_name, random_string.lambda_scraper_name.result)
}

resource "aws_cloudwatch_log_group" "lambda_scraper" {
  retention_in_days = 3
  name              = format("/aws/lambda/%s", local.lambda_scraper_name)
}

resource "aws_iam_role" "lambda_scraper" {
  name = format("LambdaRole-%s", local.lambda_scraper_name)

  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Action" : "sts:AssumeRole",
        "Principal" : {
          "Service" : "lambda.amazonaws.com"
        },
        "Effect" : "Allow",
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_scraper_policy_cloudwatch_log_group" {
  name = "CloudwatchLogGroup"
  role = aws_iam_role.lambda_scraper.name
  policy = jsonencode(
    {
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Effect" : "Allow",
          "Action" : "logs:CreateLogGroup",
          "Resource" : "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
        },
        {
          "Effect" : "Allow",
          "Action" : [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Resource" : [
            "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.lambda_scraper_name}:*"
          ]
        }
      ]
    }
  )
}

resource "aws_iam_role_policy" "lambda_scraper_policy_sqs_publisher" {
  name = "SQSPublisher"
  role = aws_iam_role.lambda_scraper.name
  policy = jsonencode(
    {
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Sid" : "VisualEditor0",
          "Effect" : "Allow",
          "Action" : [
            "sqs:SendMessage",
          ],
          "Resource" : aws_sqs_queue.archival.arn
        }
      ]
    }
  )
}

resource "aws_iam_role_policy" "lambda_scraper_policy_sns_publisher" {
  name = "SNSPublisher"
  role = aws_iam_role.lambda_scraper.name
  policy = jsonencode(
    {
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Sid" : "VisualEditor0",
          "Effect" : "Allow",
          "Action" : [
            "sns:Publish",
          ],
          "Resource" : aws_sns_topic.price_notification.arn
        }
      ]
    }
  )
}

resource "null_resource" "lambda_scraper_dependencies_installer" {
  provisioner "local-exec" {
    command = "cd ${path.module}/lambda-sources/lambda-scraper && npm install"
  }
}

data "archive_file" "lambda_scraper" {
  depends_on  = [null_resource.lambda_scraper_dependencies_installer]
  type        = "zip"
  source_dir  = "${path.module}/lambda-sources/lambda-scraper"
  output_path = "${path.module}/lambda-sources/lambda-scraper.zip"
}

resource "aws_lambda_function" "lambda_scraper" {
  depends_on       = [null_resource.lambda_scraper_dependencies_installer, data.archive_file.lambda_scraper]
  filename         = data.archive_file.lambda_scraper.output_path
  function_name    = local.lambda_scraper_name
  role             = aws_iam_role.lambda_scraper.arn
  handler          = "index.handler"
  runtime          = "nodejs14.x"
  timeout          = 120
  memory_size      = 256
  source_code_hash = data.archive_file.lambda_scraper.output_base64sha256
  environment {
    variables = {
      "ARCHIVAL_SQS_URL"        = aws_sqs_queue.archival.id,
      "ARCHIVAL_S3_BUCKET_NAME" = aws_s3_bucket.archival.id,
      "NOTIFICATION_SNS_PRICE"  = aws_sns_topic.price_notification.arn
    }
  }
}

resource "random_string" "aws_cloudwatch_event_rule_scraper_name" {
  length  = 16
  special = false
}

resource "aws_cloudwatch_event_rule" "scraper" {
  name                = "${var.service_name}-scraper-${random_string.aws_cloudwatch_event_rule_scraper_name.result}"
  description         = "Start coin scraping"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "scraper" {
  for_each = toset(var.coin_list)
  arn      = aws_lambda_function.lambda_scraper.arn
  rule     = aws_cloudwatch_event_rule.scraper.id
  input = jsonencode({
    "coin_name" : each.value
  })
}

resource "aws_lambda_permission" "allow_event_rule_scheduler_scraper" {
  statement_id  = "AllowExecutionFromEventRule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_scraper.arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scraper.arn
}
