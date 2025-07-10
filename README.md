# LoadTestingProject

This project demonstrates load and performance testing using two open-source tools: [k6](https://k6.io/) and [Locust](https://locust.io/). It simulates real-world API traffic to evaluate the performance, scalability, and reliability of backend systems.

---

## 📌 Tools Used

- **k6** (JavaScript-based)
- **Locust** (Python-based)
- **REST APIs**
- CLI & JSON summary outputs
- GitHub Actions for CI testing

---

## 🧪 Test Scenarios

- Spike testing
- Soak testing
- Stress testing
- Load testing

---

## 🚀 How to Run the Tests

### 🔹 Run k6 Locally
Place your test scripts inside the `k6/Automation_Practice/` folder.

Run all tests:
```bash
for file in ./k6/Automation_Practice/*.js; do
  echo "Running $file"
  k6 run "$file"
done
```
### 🔹 Run with Locust:
```bash
pip install locust
locust -f ./locust/locustfile.py --headless -u 10 -r 2 --run-time 1m --host=https://automationpractice.com
```
