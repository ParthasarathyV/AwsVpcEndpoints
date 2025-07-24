sequenceDiagram
    %% === Participants ===
    participant SNS as SNS Event
    participant ECS as ECS Handler
    participant L4 as lvl4CostDetails$$scenario
    participant refBU as refBU Lookup
    participant L3 as lvl3CostDetails$$scenario
    participant Taxonomy as ipTaxonomy
    participant L1 as lvl1FinancialsSummary
    participant L2 as lvl2FinancialsSummary
    participant Audit as auditCollection

    %% === saveDataTransactionally flow (IP_COST_DETAILS) ===
    Note over SNS,ECS: IP_COST_DETAILS → saveDataTransactionally()

    SNS->>ECS: Trigger costDetails event
    ECS->>L4: Upsert 1 doc (raw costs[])
    ECS->>refBU: Lookup and enrich each cost item
    ECS->>ECS: Aggregate to year-wise group
    ECS->>L3: bulkWrite with replaceOne (upsert:true) for new years
    ECS->>L3: deleteMany for stale years (not in current event)
    ECS->>Audit: Insert audit trail

    %% === deleteByCriteria flow (IP_COST_DETAILS delete) ===
    Note over SNS,ECS: IP_COST_DETAILS → deleteByCriteria()

    SNS->>ECS: Trigger event with action=delete
    ECS->>L3: deleteMany (by ipLongId + planId + scenario)
    ECS->>L4: deleteOne (by ipLongId + planId + scenario)
    ECS->>Audit: Insert audit trail

    %% === saveDataTransactionally flow (IP_COST_SUMMARY) ===
    Note over SNS,ECS: IP_COST_SUMMARY → saveDataTransactionally()

    SNS->>ECS: Trigger summary event
    ECS->>L1: Upsert 1 doc (set scenario:{} block)
    ECS->>Taxonomy: Lookup ipTaxonomy by proposalId
    ECS->>ECS: Transform scenario:{} to scenario:[{year,...}]
    ECS->>L2: Upsert (or bulk replace) L2 with scenario array
    ECS->>Audit: Insert audit trail

    %% === deleteByCriteria flow (IP_COST_SUMMARY delete) ===
    Note over SNS,ECS: IP_COST_SUMMARY → deleteByCriteria()

    SNS->>ECS: Trigger event with action=delete
    ECS->>L2: Remove matching year blocks from scenario array
    ECS->>Audit: Insert audit trail
