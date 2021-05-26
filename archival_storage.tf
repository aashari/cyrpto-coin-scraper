resource "aws_s3_bucket" "archival" {
  bucket = format("%s-archival-%s-%s", var.service_name, data.aws_region.current.name, data.aws_caller_identity.current.account_id)
  acl    = "private"
}

resource "aws_s3_bucket_public_access_block" "archival" {
  bucket                  = aws_s3_bucket.archival.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
