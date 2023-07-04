package crud

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type User struct {
	ID        string    `bson:"_id,omitempty"`
	Name      string    `bson:"name"`
	Email     string    `bson:"email"`
	CreatedAt time.Time `bson:"created_at"`
}

var (
	dbName         = "your-db-name"  // Replace with your database name
	collectionName = "users"         // Replace with your collection name
	connectionURI  = "mongodb://localhost:27017"
)

// createClient creates a connection to the MongoDB server.
func createClient() (*mongo.Client, error) {
	clientOptions := options.Client().ApplyURI(connectionURI)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, err
	}
	err = client.Ping(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// CreateUser inserts a new user into the database.
func CreateUser(user User) error {
	client, err := createClient()
	if err != nil {
		return err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	_, err = collection.InsertOne(context.Background(), user)
	if err != nil {
		return err
	}

	return nil
}

// ReadUser retrieves a user from the database based on the given ID.
func ReadUser(id string) (*User, error) {
	client, err := createClient()
	if err != nil {
		return nil, err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	filter := bson.M{"_id": id}

	var user User
	err = collection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// UpdateUser updates a user in the database with the given ID, name, and email.
func UpdateUser(id string, name string, email string) error {
	client, err := createClient()
	if err != nil {
		return err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"name":  name,
			"email": email,
		},
	}

	_, err = collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}

	return nil
}

// DeleteUser deletes a user from the database based on the given ID.
func DeleteUser(id string) error {
	client, err := createClient()
	if err != nil {
		return err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	filter := bson.M{"_id": id}

	_, err = collection.DeleteOne(context.Background(), filter)
	if err != nil {
		return err
	}

	return nil
}
