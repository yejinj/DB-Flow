describe('Document API', () => {
    let docId;
  
    it('should create a document', async () => {
      const res = await request(app)
        .post('/documents')
        .send({ title: 'test', content: 'hello' });
  
      expect(res.statusCode).toBe(201);
      expect(res.body._id).toBeDefined();
      docId = res.body._id;
    });
  
    it('should retrieve the created document', async () => {
      const res = await request(app).get(`/documents/${docId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('test');
    });
  });