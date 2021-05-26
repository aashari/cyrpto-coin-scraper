variable "service_name" {
  type        = string
  default     = "crypscr"
  description = "The service name for this stack"
}

variable "coin_list" {
  type = list(string)
  default = [
    "doge",
    "btc",
    "eth",
    "xrp",
    "bnb"
  ]
}