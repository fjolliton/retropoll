from setuptools import setup

setup(
    name='poll',
    install_requires=['aiohttp'],
    entry_points={
        'console_scripts': [
            'server = server:main',
        ],
    }
)
