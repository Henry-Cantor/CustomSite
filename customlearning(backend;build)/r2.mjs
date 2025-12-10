import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const BUCKET = "custom-learning"; // Your bucket
const FILE_PATH = "dist/CustoMLearning-Setup.exe"; // Your local file
const KEY = path.basename(FILE_PATH); // Object name in R2
const PART_SIZE = 50 * 1024 * 1024; // 50 MB per part

// Configure R2 S3 client
const client = new S3Client({
  region: "auto",
  endpoint: `https://b5d9b38cb16b2e20ec773d8815127fe9.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: "c3a510a2371d777b08507b85f6d1f59b",
    secretAccessKey: "159cd51ac5dcacca0d10d1fc1bbcb3906232ee51960a6c01222d42dd2c77d652",
  },
});

async function multipartUpload() {
  const fileSize = fs.statSync(FILE_PATH).size;
  const numParts = Math.ceil(fileSize / PART_SIZE);
  const parts = [];

  console.log(`Uploading ${fileSize} bytes in ${numParts} parts...`);

  // 1️⃣ Start multipart upload
  const createResp = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: KEY,
    })
  );
  const uploadId = createResp.UploadId;
  console.log("Multipart upload started, UploadId:", uploadId);

  try {
    // 2️⃣ Upload each part
    for (let partNumber = 1; partNumber <= numParts; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileSize);
      const stream = fs.createReadStream(FILE_PATH, { start, end: end - 1 });

      console.log(`Uploading part ${partNumber} (${start}-${end})...`);

      const uploadPartResp = await client.send(
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: KEY,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: stream,
        })
      );

      parts.push({
        ETag: uploadPartResp.ETag,
        PartNumber: partNumber,
      });
    }

    // 3️⃣ Complete multipart upload
    const completeResp = await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: KEY,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );

    console.log("Upload complete!", completeResp.Location || KEY);
  } catch (err) {
    console.error("Upload failed, aborting multipart upload...", err);
    await client.send(
      new AbortMultipartUploadCommand({
        Bucket: BUCKET,
        Key: KEY,
        UploadId: uploadId,
      })
    );
  }
}

multipartUpload();
