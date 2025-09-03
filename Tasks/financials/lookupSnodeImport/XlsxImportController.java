package com.jpmorgan.myig.controller;

import com.jpmorgan.myig.service.XlsxImportHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@RestController
@RequestMapping("/costs")
@RequiredArgsConstructor
public class XlsxImportController {

    private final XlsxImportHandler xlsxImportHandler;

    @PostMapping("/import")
    public ResponseEntity<String> importXlsx(
            @RequestParam("eventType") String type,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "s3Link", required = false) String s3Link
    ) throws Exception {

        // 1) Multipart path (preferred)
        if (file != null && !file.isEmpty()) {
            String name = file.getOriginalFilename();
            String suffix = (name != null && name.toLowerCase().endsWith(".xlsm")) ? ".xlsm" : ".xlsx";
            Path tmp = Files.createTempFile("lookup-upload-", suffix);
            try {
                file.transferTo(tmp);
                xlsxImportHandler.handleXlsxImportFromPath(type, tmp);
                return ResponseEntity.ok("Imported from multipart upload for type=" + type);
            } finally {
                Files.deleteIfExists(tmp);
            }
        }

        // 2) Fallback to S3
        if (s3Link != null && !s3Link.isBlank()) {
            xlsxImportHandler.handleXlsxImportFromS3(type, s3Link);
            return ResponseEntity.ok("Imported from S3 for type=" + type);
        }

        // 3) Neither provided
        return ResponseEntity.badRequest()
                .body("Provide either multipart 'file' or 's3Link' to /costs/import");
    }
}
