from setuptools import setup

setup(
    name='poll',
    entry_points={
        'console_scripts': [
            'server = server:main',
        ],
    }
)
