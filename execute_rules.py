import logging
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Define the path to your rules file
RULES_FILE_PATH = r'C:\Users\user1\.codeium\windsurf\memories\global_rules.md'

def load_rules(file_path):
    """Load rules from a Markdown file."""
    with open(file_path, 'r') as file:
        lines = file.readlines()
    # Extract rules, assuming each rule is on a new line prefixed with "- "
    rules = [line.strip().replace("- ", "") for line in lines if line.strip().startswith("- ")]
    return rules

def check_rule(rule):
    """Simulate checking a rule."""
    logging.info(f"Checking rule: {rule}")
    # Implement the logic to check if the rule is followed
    # For demonstration, we'll assume all rules pass
    return True

def execute_task(task):
    """Simulate executing a task and checking rules afterward."""
    logging.info(f"Executing task: {task}")

    # Simulate task execution
    # ... your task execution logic here ...

    # Check rules after task completion
    rules = load_rules(RULES_FILE_PATH)
    for rule in rules:
        if not check_rule(rule):
            logging.error(f"Rule failed: {rule}")
            return False

    logging.info("All rules checked successfully after task completion.")
    return True

def main():
    tasks = ["Task 1", "Task 2", "Task 3"]  # Example tasks
    for task in tasks:
        while not execute_task(task):
            logging.warning(f"Retrying task: {task} due to rule check failure.")
        logging.info(f"Task {task} completed successfully with all rules checked.")

if __name__ == "__main__":
    main()
