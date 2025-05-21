import asyncio
import websockets
import json
import sys

async def test_websocket():
    # Replace with your actual token
    token = input("Enter your JWT token: ")
    
    uri = f"ws://localhost:8000/ws/toota/?token={token}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket server")
            
            # Test message
            test_message = {
                "type": "echo.message",
                "data": {
                    "message": "Hello, WebSocket!"
                }
            }
            
            await websocket.send(json.dumps(test_message))
            print(f"Sent: {test_message}")
            
            # Wait for response
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Keep the connection open for a while
            await asyncio.sleep(5)
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Connection closed: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())

