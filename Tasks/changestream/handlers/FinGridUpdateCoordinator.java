package com.jpmchase.myig.handler;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class FinGridUpdateCoordinator {

    @Autowired 
    private FinancialsLevel3Handler financialsLevel3Handler;
    
    @Autowired 
    private AppMappingsHandler appMappingsHandler;
    
    @Autowired 
    private BillingKeyHeaderHandler billingKeyHeaderHandler;
    
    // TaxonomyHandler can be added later.

    public void handleFinancialLevel3Change(Document doc) {
        financialsLevel3Handler.process(doc);
    }

    // For changes in dependent collections, currently we re-trigger a full update.
    public void handleAppMappingChange(Document doc) {
        financialsLevel3Handler.process(doc);
    }

    public void handleBillingKeyChange(Document doc) {
        financialsLevel3Handler.process(doc);
    }
    
    public void handleTaxonomyChange(Document doc) {
        financialsLevel3Handler.process(doc);
    }
}