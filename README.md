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
Place all your test scripts inside the `k6/Automation Practice/` folder.

Then run the following command in your terminal:

```bash
for file in ./k6/Automation Practice/*.js; do
  echo "Running $file"
  k6 run "$file"
done
```

### 🔹 Run with Locust:
```bash
locust -f ./locust/locustfile.py
```
