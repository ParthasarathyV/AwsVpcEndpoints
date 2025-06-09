List<AggregationOperation> stages = new ArrayList<>();

// Stage 1: $match
stages.add(
    Aggregation.match(
        Criteria.where("ipLongId").is("37ba5272-68d1-4d7a-bb18-e9c06059bf46")
    )
);

// Stage 2: $lookup with pipeline using fluent builder
stages.add(
    Aggregation.lookup()
        .from("testIpTaxonomy")
        .let(VariableOperators.Let
            .variable("proposalId")
            .forField("proposalId")
        )
        .pipeline(
            Aggregation.match(
                Criteria.expr(
                    ComparisonOperators.valueOf("ipLongId")
                        .equalToValue("$$proposalId")
                )
            ),
            Aggregation.project("taxonomyAllocations").andExclude("_id")
        )
        .as("taxonomyAllocations")
);

// Stage 3: $addFields to extract arrayElemAt
stages.add(
    Aggregation.addFields()
        .addFieldWithValue(
            "taxonomyAllocations",
            AggregationSpELExpression.expressionOf(
                "arrayElemAt(taxonomyAllocations.taxonomyAllocations, 0)"
            )
        ).build()
);
