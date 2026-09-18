import asyncio
import json
import time
from langchain_core.messages import HumanMessage
from bludai.core.graph import app as compiled_app

EVAL_DATASET = [
    {'prompt': 'Hello, what is your name?', 'expected_route': 'FINISH'},
    {'prompt': 'Write a new python script called test.py that prints hello', 'expected_route': 'Developer'},
    {'prompt': 'Search the web for the latest Python version', 'expected_route': 'Researcher'},
    {'prompt': 'Run pytest on the backend', 'expected_route': 'Executor'}
]

def evaluate():
    print("Starting Supervisor Routing Evaluation...")
    correct = 0
    total = len(EVAL_DATASET)
    
    for idx, item in enumerate(EVAL_DATASET):
        print(f"\n[Test {idx+1}/{total}]: {item['prompt']}")
        
        config = {'configurable': {'thread_id': f'eval_thread_{idx}'}}
        inputs = {
            'messages': [HumanMessage(content=item['prompt'])],
            'checklist': '',
            'next': 'Supervisor'
        }
        
        route_taken = None
        
        for mode, payload in compiled_app.stream(inputs, config=config, stream_mode=['updates']):
            if mode == 'updates':
                step = payload
                if 'Supervisor' in step:
                    route_taken = step['Supervisor'].get('next')
                    break
                    
        expected = item['expected_route']
        if route_taken == expected:
            print(f"  ✅ PASS. Expected: {expected}, Got: {route_taken}")
            correct += 1
        else:
            print(f"  ❌ FAIL. Expected: {expected}, Got: {route_taken}")
            
    accuracy = (correct / total) * 100
    print(f"\nEvaluation Complete. Score: {correct}/{total} ({accuracy:.1f}%)")
    
    # Save benchmark results
    with open('eval_results.json', 'w') as f:
        json.dump({'accuracy': accuracy, 'correct': correct, 'total': total, 'timestamp': time.time()}, f)

if __name__ == '__main__':
    evaluate()
