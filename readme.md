## fazer
.venv/scripts/activate
pip install -r requirementes.txt
pyinstaller --noconsole --add-data "templates;templates" --add-data "static;static" --add-data "dados;dados" app.py
cd dist, .\app.exe