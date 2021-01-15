from locust import HttpUser, TaskSet, task, between, SequentialTaskSet
import logging, sys

def function_task(taskset):
        taskset.client.get("automationpractice.com/index.php")
        
class UserBehaviour(SequentialTaskSet):
    min_wait = 1000
    max_wait = 5000
   
    @task
    def paralell_test(self):
        tasks = [function_task]
        with self.client.get("automationpractice.com/index.php?controller=authentication&back=my-account", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.elapsed.total_seconds() > 10:
                response.failure("Request took too long")
        with self.client.get("automationpractice.com/index.php?controller=contact", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.elapsed.total_seconds() > 10:
                response.failure("Request took too long")
        with self.client.get("automationpractice.com/index.php?id_category=3&controller=category", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.elapsed.total_seconds() > 10:
                response.failure("Request took too long")
        with self.client.get("automationpractice.com/index.php?controller=prices-drop", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.elapsed.total_seconds() > 10:
                response.failure("Request took too long")   
               
class User(HttpUser):
    wait_time = between(1, 5)
    tasks = [UserBehaviour]
