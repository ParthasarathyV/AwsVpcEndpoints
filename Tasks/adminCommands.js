db.adminCommand(
    {
      currentOp: true,
      $or: [{"ns": "psd2DataIngestion.movements"},{"ns": "crmDataIngestion.centrico"}]
    }
)
db.adminCommand(
  {
    currentOp: true,
    $or: [{"ns": "crm.account"}]
  }
)

db.adminCommand(
  {
    currentOp: true,
    $or: [
      { op: "command", "command.createIndexes": { $exists: true }  },
      { op: "none", "msg" : /^Index Build/ }
    ]
  }
)