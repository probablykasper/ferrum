const elasticsearch = require("elasticsearch");
const elastic = new elasticsearch.Client({
    host: "elastic:9200",
    httpAuth: "elastic:changeme",
    apiVersion: "5.5",
    log: "trace"
});
module.exports = elastic;

function eslog(err, res) {
    console.log("---------res");
    console.log(res);
    console.log("---------err");
    console.log(err);
}

function createCatalogIndex() {
    elastic.indices.create({
        index: "catalog",
        body: {
            settings: {
                index: {
                    number_of_shards: 5,
                    number_of_replicas: 1
                }
            },
            mappings: {
                track: {
                    properties: {
                        album: {
                            type: "text",
                            include_in_all: true
                        },
                        appearsOn: {
                            type: "text",
                            include_in_all: true
                        },
                        artist: {
                            type: "text",
                            boost: 1.5,
                            include_in_all: true
                        },
                        bitrate: {
                            type: "long",
                            include_in_all: false
                        },
                        dateAdded: {
                            type: "date",
                            include_in_all: false,
                            format: "yyyy-MM-dd HH:mm:ss"
                        },
                        genre: {
                            type: "text",
                            include_in_all: true
                        },
                        inTrash: {
                            type: "boolean",
                            include_in_all: false
                        },
                        name: {
                            type: "text",
                            boost: 1.5,
                            include_in_all: true,
                            fields: {
                                keyword: {
                                    type: "keyword"
                                }
                            }
                        },
                        plays: {
                            type: "long",
                            include_in_all: false
                        },
                        sourcePlatform: {
                            type: "text",
                            include_in_all: false
                        },
                        tags: {
                            type: "text",
                            include_in_all: true
                        },
                        time: {
                            type: "long",
                            include_in_all: false
                        },
                        trackId: {
                            type: "keyword",
                            boost: 10,
                            include_in_all: false
                        },
                        userId: {
                            type: "keyword",
                            boost: 10,
                            include_in_all: false
                        },
                    }
                }
            }
        }
    }, eslog);
}
function deleteCatalogIndex() {
    elastic.indices.delete({
        index: "catalog"
    }, eslog)
}

function deleteCatalogDocuments() {
    elastic.deleteByQuery({
        index: "catalog",
        type: "track",
        q: "*"
    }, eslog);
}
