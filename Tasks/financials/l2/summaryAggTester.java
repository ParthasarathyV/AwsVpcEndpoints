import org.bson.Document;
import org.bson.json.JsonWriterSettings;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SummaryAggrComponentTest {

    private static final JsonWriterSettings PRETTY =
            JsonWriterSettings.builder()
                              .indent(true)             // new-line & two-space indent
                              .build();

    @Test
    void fetchL1ToL2aggregation_buildsExpectedPipeline() throws Exception {
        // given
        String proposalId = "P-42";
        SummaryAggrComponent component = new SummaryAggrComponent();

        // when
        Aggregation agg = component.fetchL1ToL2aggregation(proposalId);

        // then
        List<Document> pipeline = agg.toPipeline(Aggregation.DEFAULT_CONTEXT);

        // ---- ASSERTIONS (keep your existing ones) --------------------------
        assertThat(pipeline.get(0))
               .isEqualTo(new Document("$match",
                          new Document(CommonEnums.IP_ID_KEY.getValue(), proposalId)));
        assertThat(pipeline).hasSize(5);
        // --------------------------------------------------------------------

        // ---- PRINT THE PIPELINE --------------------------------------------
        System.out.println("========== pipeline to paste into Compass ==========");
        pipeline.forEach(stage ->
                System.out.println(stage.toJson(PRETTY) + ","));
        System.out.println("=====================================================");
    }
}
