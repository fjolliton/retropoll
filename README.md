# RetroPoll

Small web app for creating anonymous polls

![image](https://user-images.githubusercontent.com/34963/82039519-a07b9000-9694-11ea-983b-b16135cb6f97.png)

## Requirements

 - Python 3.6+

## Installation

```
python3 -m venv venv
venv/bin/python3 -m pip install -e .
```

## Usage

By default, the server will bind to `127.0.0.1` on port 8666. Use the
`--host` and `--port` options to change that.

```
venv/bin/server --host 0.0.0.0 --port 80
```
