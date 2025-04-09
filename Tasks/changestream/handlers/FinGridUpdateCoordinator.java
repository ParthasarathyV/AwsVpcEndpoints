package com.jpmchase.myig.handler;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class FinGridUpdateCoordinator {

    @Autowired 
    private FinancialLevel3Handler financialLevel3Handler;
    
    @Autowired 
    private AppMappingHandler appMappingHandler;
    
    @Autowired 
    private BillingKeyHandler billingKeyHandler;
    
    // For complete update from financialLevel3 changes:
    public void handleFinancialLevel3Change(Document doc) {
        financialLevel3Handler.process(doc);
    }

    // For changes isolated to appMappings only:
    public void handleAppMappingChange(Document doc) {
        appMappingHandler.updateOnlyAppMappings(doc);
    }

    // For changes isolated to billingKeyHeader only:
    public void handleBillingKeyChange(Document doc) {
        billingKeyHandler.updateOnlyBillingKey(doc);
    }
    
    // For taxonomy changes (stub for now):
    public void handleTaxonomyChange(Document doc) {
        // Future implementation...
    }
}
