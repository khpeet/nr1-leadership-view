module.exports = {
  workloadStatus: (cursor, guid) => {
    if (cursor == null) {
      return `
      {
          actor {
            entity(guid: "${guid}") {
              relatedEntities {
                nextCursor
                results {
                  target {
                    accountId
                    entity {
                      tags {
                        key
                        values
                      }
                      alertSeverity
                      account {
                        id
                        name
                      }
                      name
                      guid
                      type
                      permalink
                    }
                  }
                }
              }
            }
          }
        }
      `;
    } else {
      return `
      {
          actor {
            entity(guid: "${guid}") {
              relatedEntities(cursor: "${c}") {
                nextCursor
                results {
                  target {
                    accountId
                    entity {
                      tags {
                        key
                        values
                      }
                      alertSeverity
                      account {
                        id
                        name
                      }
                      name
                      guid
                      type
                      permalink
                    }
                  }
                }
              }
            }
          }
        }
      `;
    }
  }
}
