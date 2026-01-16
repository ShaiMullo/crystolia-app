resource "aws_ecr_repository" "frontend" {
  name                 = "crystolia-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "backend" {
  name                 = "crystolia-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Environment = var.environment
  }
}
