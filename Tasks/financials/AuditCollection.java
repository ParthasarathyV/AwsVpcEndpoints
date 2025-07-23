@Document(collection = "auditCollection")
@Data
@Builder
public class AuditCollection {

    @Field("eventType")
    private String eventType;

    @Field("proposalId")
    private String proposalId;

    @Field("planId")
    private String planId;

    @Field("scenario")
    private String scenario;

    @Field("verId")
    private String verId;

    @Field("dbVerId")
    private String dbVerId;

    @Field("action")
    private String action;

    @Field("messageType")
    private String messageType;

    @Field("status")
    private String status;

    @Field("comment")
    private List<Comment> comment = new ArrayList<>();

    @Field("auditTimestamp")
    private Date auditTimestamp;

    public void addComment(String msg) {
        if (this.comment == null) this.comment = new ArrayList<>();
        this.comment.add(new Comment(msg, new Date()));
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Comment {
        private String msg;

        @Field("t")
        private Date t;
    }
}
