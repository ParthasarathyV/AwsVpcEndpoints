package com.jpmc.recon;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconRow {
    private String proposalId;

    private String outlookPlanId;
    private String l1OutlookVerId;
    private List<String> l2OutlookVerId;
    private List<String> l3OutlookVerId;
    private String l4OutlookVerId;

    private Boolean isCostsAddedInL4;

    private Boolean l1ToL2Recon;
    private Boolean l1ToL4Recon;
    private Boolean l4ToL3Recon;
}
