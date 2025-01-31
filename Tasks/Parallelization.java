import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Override
public ResponseEntity<ProposalGridResponse> searchProposals(GridRequest gridRequest) {
    final GridRequest originalRequest = GridRequestMapper.MAPPER.map(gridRequest);

    // Use CompletableFuture to execute tasks concurrently
    CompletableFuture<List<ProposalGrid>> resultFuture = CompletableFuture.supplyAsync(() ->
            proposalGridService.searchProposals(gridRequest));

    CompletableFuture<GridTotalsDto> gridTotalsDtoFuture = CompletableFuture.supplyAsync(() ->
            proposalGridService.calculateTotals(originalRequest));

    // Combine the results when both tasks are completed
    return resultFuture.thenCombine(gridTotalsDtoFuture, (result, gridTotalsDto) ->
            new ResponseEntity<>(
                    new ProposalGridResponse()
                            .data(ProposalGridMapper.MAPPER.map(result))
                            .totals(gridTotalsDto),
                    HttpStatus.OK
            )
    ).join();
}
