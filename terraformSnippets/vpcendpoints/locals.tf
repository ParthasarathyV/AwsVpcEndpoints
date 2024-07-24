workspace_name = var.config.workspace_name == "iac_datastores_devcore" ? "iac_datastores_devcore" : "another_workspace_name"

im_recordings_s3 = {
  bucket_name = lookup(data.terraform_remote_state.${workspace_name}.outputs["im-recordings-s3"], "bucket_name")
  bucket_arn  = lookup(data.terraform_remote_state.${workspace_name}.outputs["im-recordings-s3"], "bucket_arn")
}
