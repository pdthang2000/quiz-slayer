# Context map

`draft`

```
Content Ingestion ──publishes──> Question Bank ──read by──> Daily Practice
                                                                │
                                                                │ MistakeRecorded (event)
                                                                v
                                                          Card Library

Identity ──(user id)──> all contexts
```

- Daily Practice keeps its own snapshot of the items it served, so fixing an answer key later doesn't change past scores. `draft`
- Daily Practice never reads Card Library tables directly. It goes through a Card Library API that only returns Active cards. `confirmed` (see READ-01)
