terraform {
  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "2.2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "3.1.0"
    }
  }
}

provider "archive" {
}

provider "null" {
}

provider "aws" {
  default_tags {
    tags = {
      ServiceName = var.service_name
    }
  }
}
