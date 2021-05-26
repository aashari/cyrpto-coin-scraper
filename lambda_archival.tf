resource "random_string" "lambda_archival_name" {
  length  = 16
  special = false
}

locals {
  lambda_archival_name = format("%s-archival-%s", var.service_name, random_string.lambda_archival_name.result)
}

resource "aws_cloudwatch_log_group" "lambda_archival" {
  retention_in_days = 3
  name              = format("/aws/lambda/%s", local.lambda_archival_name)
}

resource "aws_iam_role" "lambda_archival" {
  name = format("LambdaRole-%s", local.lambda_archival_name)

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

resource "aws_iam_role_policy" "lambda_archival_policy_cloudwatch_log_group" {
  name = "CloudwatchLogGroup"
  role = aws_iam_role.lambda_archival.name
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
            "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.lambda_archival_name}:*"
          ]
        }
      ]
    }
  )
}

resource "aws_iam_role_policy" "lambda_archival_policy_s3_bucket_write" {
  name = "S3BucketWrite"
  role = aws_iam_role.lambda_archival.name
  policy = jsonencode(
    {
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Effect" : "Allow",
          "Action" : [
            "s3:PutObject",
            "s3:GetObject"
          ],
          "Resource" : "${aws_s3_bucket.archival.arn}/*"
        }
      ]
    }
  )
}

resource "aws_iam_role_policy" "lambda_archival_policy_sqs_retreival" {
  name = "SQSRetreival"
  role = aws_iam_role.lambda_archival.name
  policy = jsonencode(
    {
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Effect" : "Allow",
          "Action" : [
            "sqs:ReceiveMessage",
            "sqs:GetQueueAttributes"
          ],
          "Resource" : aws_sqs_queue.archival.arn
        },
        {
          "Effect" : "Allow",
          "Action" : "sqs:ListQueues",
          "Resource" : "*"
        },
        {
          "Effect" : "Allow",
          "Action" : [
            "sqs:DeleteMessage",
            "sqs:DeleteMessageBatch"
          ],
          "Resource" : [
            aws_sqs_queue.archival.arn,
            "${aws_sqs_queue.archival.arn}/*"
          ]
        }
      ]
    }
  )
}

resource "null_resource" "lambda_archival_dependencies_installer" {
  provisioner "local-exec" {
    command = "cd ${path.module}/lambda-sources/lambda-archival && npm install"
  }
}

data "archive_file" "lambda_archival" {
  depends_on  = [null_resource.lambda_archival_dependencies_installer]
  type        = "zip"
  source_dir  = "${path.module}/lambda-sources/lambda-archival"
  output_path = "${path.module}/lambda-sources/lambda-archival.zip"
}

resource "aws_lambda_function" "lambda_archival" {
  depends_on       = [null_resource.lambda_archival_dependencies_installer, data.archive_file.lambda_archival]
  filename         = data.archive_file.lambda_archival.output_path
  function_name    = local.lambda_archival_name
  role             = aws_iam_role.lambda_archival.arn
  handler          = "index.handler"
  runtime          = "nodejs14.x"
  timeout          = 120
  memory_size      = 256
  source_code_hash = data.archive_file.lambda_archival.output_base64sha256
  environment {
    variables = {
      "ARCHIVAL_SQS_URL"        = aws_sqs_queue.archival.id,
      "ARCHIVAL_S3_BUCKET_NAME" = aws_s3_bucket.archival.id,
      "NOTIFICATION_SNS_PRICE"  = aws_sns_topic.price_notification.arn
    }
  }
}

resource "aws_lambda_event_source_mapping" "archival" {
  event_source_arn = aws_sqs_queue.archival.arn
  function_name    = aws_lambda_function.lambda_archival.arn
  batch_size       = 1
}