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
    ECS->>L4: Check versionId (is latest?)
    alt version is not latest
        ECS->>Audit: log SKIPPED in audit
    else
        ECS->>L4: Upsert 1 doc (raw costs[])
        ECS->>refBU: Lookup and enrich each cost item
        ECS->>ECS: Aggregate to year-wise group
        ECS->>L3: bulkWrite with replaceOne (upsert:true)
        ECS->>L3: deleteMany for stale years
        ECS->>Audit: Insert audit trail
    end

    %% === deleteByCriteria flow (IP_COST_DETAILS delete) ===
    Note over SNS,ECS: IP_COST_DETAILS → deleteByCriteria()

    SNS->>ECS: Trigger event with action=delete
    ECS->>L4: Check versionId (is latest?)
    alt version is not latest
        ECS->>Audit: log SKIPPED in audit
    else
        ECS->>L3: deleteMany (ipLongId + planId + scenario)
        ECS->>L4: deleteOne (ipLongId + planId + scenario)
        ECS->>Audit: Insert audit trail
    end

    %% === saveDataTransactionally flow (IP_COST_SUMMARY) ===
    Note over SNS,ECS: IP_COST_SUMMARY → saveDataTransactionally()

    SNS->>ECS: Trigger summary event
    ECS->>L1: Check versionId (is latest?)
    alt version is not latest
        ECS->>Audit: log SKIPPED in audit
    else
        ECS->>L1: Upsert 1 doc (set scenario:{} block)
        ECS->>Taxonomy: Lookup ipTaxonomy
        ECS->>ECS: Transform scenario:{} to scenario:[{year, ...}]
        ECS->>L2: Upsert summary array
        ECS->>Audit: Insert audit trail
    end

    %% === deleteByCriteria flow (IP_COST_SUMMARY delete) ===
    Note over SNS,ECS: IP_COST_SUMMARY → deleteByCriteria()

    SNS->>ECS: Trigger event with action=delete
    ECS->>L1: Check versionId (is latest?)
    alt version is not latest
        ECS->>Audit: log SKIPPED in audit
    else
        ECS->>L1: Set scenario={} (delete block)
        ECS->>ECS: Aggregate → empty array
        ECS->>L2: Write empty summary
        ECS->>Audit: Insert audit trail
    end
