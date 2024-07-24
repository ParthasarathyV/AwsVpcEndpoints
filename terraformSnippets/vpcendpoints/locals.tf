

locals {
  workspace_name = var.config.workspace_name == "iac_datastores_devcore" ? "iac_datastores_devcore" : "another_workspace_name"
}

locals {
    im_recordings_s3 = {
  bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.im-recordings-s3, "bucket_name","")
  bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.im-recordings-s3, "bucket_arn","")
}
  imediapci_vc_recordings_3y_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_3y_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_3y_s3, "bucket_arn", "")
  }
  
  imediapci_vc_recordings_13m_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_13m_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_13m_s3, "bucket_arn", "")
  }
  
  imediapci_vc_recordings_60d_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_60d_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_60d_s3, "bucket_arn", "")
  }
  
  imediapci_vc_recordings_2y_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_2y_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_recordings_2y_s3, "bucket_arn", "")
  }
  
  imediapci_lh_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_lh_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_lh_s3, "bucket_arn", "")
  }
  
  imediapci_vc_transcripts_13m_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_transcripts_13m_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_transcripts_13m_s3, "bucket_arn", "")
  }
  
  imediapci_vc_transcripts_3y_s3 = {
    bucket_name = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_transcripts_3y_s3, "bucket_name", "")
    bucket_arn  = lookup(data.terraform_remote_state[local.workspace_name].outputs.imediapci_vc_transcripts_3y_s3, "bucket_arn", "")
  }
}
