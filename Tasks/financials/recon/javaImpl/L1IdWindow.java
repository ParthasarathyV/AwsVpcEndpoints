package com.jpmc.recon;

import lombok.*;
import org.bson.types.ObjectId;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class L1IdWindow {
    private ObjectId id;        // maps _id
    private String proposalId;  // maps proposalId
}
