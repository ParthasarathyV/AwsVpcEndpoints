
db.collection.aggregate([
  {
    $set: {
      costs: {
        $map: {
          input: "$costs",
          as: "c",
          in: {
            $unset: [
              "$$c.janQty", "$$c.janTotal", "$$c.janRegHrs", "$$c.janRegTotal", "$$c.janOtHrs", "$$c.janOtTotal",
              "$$c.febQty", "$$c.febTotal", "$$c.febRegHrs", "$$c.febRegTotal", "$$c.febOtHrs", "$$c.febOtTotal",
              "$$c.marQty", "$$c.marTotal", "$$c.marRegHrs", "$$c.marRegTotal", "$$c.marOtHrs", "$$c.marOtTotal",
              "$$c.aprQty", "$$c.aprTotal", "$$c.aprRegHrs", "$$c.aprRegTotal", "$$c.aprOtHrs", "$$c.aprOtTotal",
              "$$c.mayQty", "$$c.mayTotal", "$$c.mayRegHrs", "$$c.mayRegTotal", "$$c.mayOtHrs", "$$c.mayOtTotal",
              "$$c.junQty", "$$c.junTotal", "$$c.junRegHrs", "$$c.junRegTotal", "$$c.junOtHrs", "$$c.junOtTotal",
              "$$c.julQty", "$$c.julTotal", "$$c.julRegHrs", "$$c.julRegTotal", "$$c.julOtHrs", "$$c.julOtTotal",
              "$$c.augQty", "$$c.augTotal", "$$c.augRegHrs", "$$c.augRegTotal", "$$c.augOtHrs", "$$c.augOtTotal",
              "$$c.sepQty", "$$c.sepTotal", "$$c.sepRegHrs", "$$c.sepRegTotal", "$$c.sepOtHrs", "$$c.sepOtTotal",
              "$$c.octQty", "$$c.octTotal", "$$c.octRegHrs", "$$c.octRegTotal", "$$c.octOtHrs", "$$c.octOtTotal",
              "$$c.novQty", "$$c.novTotal", "$$c.novRegHrs", "$$c.novRegTotal", "$$c.novOtHrs", "$$c.novOtTotal",
              "$$c.decQty", "$$c.decTotal", "$$c.decRegHrs", "$$c.decRegTotal", "$$c.decOtHrs", "$$c.decOtTotal"
            ]
          }
        }
      }
    }
  }
])
