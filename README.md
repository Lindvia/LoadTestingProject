# LoadTestingProject

This project demonstrates load and performance testing using two open-source tools: [k6](https://k6.io/) and [Locust](https://locust.io/). It simulates real-world API traffic to evaluate the performance, scalability, and reliability of backend systems.

---

## 📌 Tools Used
- **k6** (JavaScript-based)
- **Locust** (Python-based)
- **REST APIs**
- CLI & HTML Report outputs

---

## 🧪 Scenarios Tested
- Spike testing
- Soak testing
- Stress testing
- Load testing

---

## 🚀 How to Run the Tests

### 🔹 Run with k6:
```bash
k6 run ./k6/test-script.js
```

### 🔹 Run with Locust:
```bash
locust -f ./locust/locustfile.py
```
