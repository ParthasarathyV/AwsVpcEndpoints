package main

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)


// Reference: https://pkg.go.dev/go.mongodb.org/mongo-driver/mongo#example-Connect-X509 

func main() {
	// Configure a Client with X509 authentication
	// (https://www.mongodb.com/docs/manual/core/security-x.509/).

	// X509 can be configured with different sets of options in the connection
	// string:
	// 1. tlsCAFile (or SslCertificateAuthorityFile): Path to the file with
	// either a single or bundle of certificate authorities to be considered
	// trusted when making a TLS connection.
	// 2. tlsCertificateKeyFile (or SslClientCertificateKeyFile): Path to the
	// client certificate file or the client private key file. In the case that
	// both are needed, the files should be concatenated.

	// The SetAuth client option should also be used. The username field is
	// optional. If it is not specified, it will be extracted from the
	// certificate key file. The AuthSource is required to be $external.

	caFilePath := "path/to/cafile"
	certificateKeyFilePath := "path/to/client-certificate"

	// To configure auth via a URI instead of a Credential, append
	// "&authMechanism=MONGODB-X509" to the URI.
	uri := "mongodb://host:port/?tlsCAFile=%s&tlsCertificateKeyFile=%s"
	uri = fmt.Sprintf(uri, caFilePath, certificateKeyFilePath)
	credential := options.Credential{
		AuthMechanism: "MONGODB-X509",
	}
	clientOpts := options.Client().ApplyURI(uri).SetAuth(credential)

	client, err := mongo.Connect(context.TODO(), clientOpts)
	if err != nil {
		log.Fatal(err)
	}
	_ = client
}
