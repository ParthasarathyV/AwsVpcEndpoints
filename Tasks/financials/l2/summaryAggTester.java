package com.jpmorgan.myig.aggcomponents;

import static org.assertj.core.api.Assertions.*;

import java.io.IOException;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)      // optional; there are no Spring beans here
class SummaryAggrComponentTest {

    private final SummaryAggrComponent component = new SummaryAggrComponent();

    @Test
    void fetchL1ToL2aggregation_buildsExpectedPipeline() throws IOException {
        // given
        String proposalId = "P-42";

        // when
        Aggregation agg = component.fetchL1ToL2aggregation(proposalId);

        // then
        List<Document> pipeline = agg.toPipeline(Aggregation.DEFAULT_CONTEXT);

        // stage 0 is the $match we prepend
        assertThat(pipeline.get(0))
                .isEqualTo(new Document("$match", new Document("ipLongId", proposalId)));

        // the file currently contains three stages → total should be 1 + 3 = 4
        assertThat(pipeline).hasSize(4);
    }

    @Test
    void fetchL1ToL2aggregation_throwsIfResourceMissing() {
        SummaryAggrComponent faulty = new SummaryAggrComponent() {
            // override the method just to point at a bogus file
            @Override
            protected String resourcePath() {
                return "mongo-queries/not-there.json";
            }
        };

        assertThatThrownBy(() -> faulty.fetchL1ToL2aggregation("x"))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("Resource not found");
    }

    @Test
    void fetchL1ToL2aggregation_throwsOnInvalidJson() {
        SummaryAggrComponent faulty = new SummaryAggrComponent() {
            @Override
            protected String resourcePath() {
                return "mongo-queries/bad.json";   // a file you keep under test/resources with '{oops}'
            }
        };

        assertThatThrownBy(() -> faulty.fetchL1ToL2aggregation("x"))
                .isInstanceOf(com.fasterxml.jackson.core.JsonParseException.class)
                .hasMessageContaining("Unrecognized token");
    }
}
