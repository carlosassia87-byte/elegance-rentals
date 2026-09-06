import zipfile
import xml.etree.ElementTree as ET
import json
import urllib.request
import time

def import_clients():
    print("=== INICIANDO IMPORTACIÓN DE CLIENTES DESDE EXPORT.XLSX A SUPABASE ===")

    with zipfile.ZipFile("Export.xlsx", "r") as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                shared_strings.append(t.text if t is not None and t.text else "")

        tree = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = tree.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")
        
        headers = []
        records = []
        for idx, r in enumerate(rows):
            cols = []
            for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                t = c.attrib.get("t")
                val = v.text if v is not None else ""
                if t == "s" and val.isdigit() and int(val) < len(shared_strings):
                    val = shared_strings[int(val)]
                cols.append(val)
            if idx == 0:
                headers = cols
            else:
                if any(cols):
                    row_dict = {}
                    for h_idx, h in enumerate(headers):
                        row_dict[h] = cols[h_idx] if h_idx < len(cols) else ""
                    records.append(row_dict)

    print(f"Total filas leídas del Excel: {len(records)}")

    cleaned_clients = []
    seen_ids = set()

    for idx, r in enumerate(records):
        try:
            raw_id = r.get("IDCLIENTES", "").strip()
            id_cli = int(raw_id) if raw_id and raw_id != "0" else (idx + 1)
        except Exception:
            id_cli = idx + 1
            
        while id_cli in seen_ids:
            id_cli += 100000
        seen_ids.add(id_cli)

        try:
            raw_ced = r.get("CEDULA", "").replace(".", "").replace("-", "").replace(" ", "").strip()
            cedula = int(raw_ced) if raw_ced and raw_ced != "0" else 0
        except Exception:
            cedula = 0

        nombre = r.get("NOMBRE", "").strip().upper()
        if not nombre:
            nombre = f"CLIENTE {id_cli}"

        direccion = r.get("DIRECCION", "").strip()
        if direccion == "0":
            direccion = ""

        tel1 = r.get("TELEFONO", "").strip()
        if tel1 in ("0", "0.0"):
            tel1 = ""
        if tel1.endswith(".0"):
            tel1 = tel1[:-2]

        tel2 = r.get("TELEFONO2", "").strip()
        if tel2 in ("0", "0.0"):
            tel2 = ""
        if tel2.endswith(".0"):
            tel2 = tel2[:-2]

        empresa = r.get("EMPRESA", "").strip()
        if empresa == "0":
            empresa = ""

        diremp = r.get("DIRECCIONEMP", "").strip()
        if diremp == "0":
            diremp = ""

        nota = r.get("NOTA", "").strip()
        if nota == "0":
            nota = ""

        try:
            raw_saldo = r.get("SALDO", "0").replace("$", "").replace(".", "").replace(",", "").strip()
            saldo = int(float(raw_saldo)) if raw_saldo else 0
        except Exception:
            saldo = 0

        item = {
            "IDCLIENTES": id_cli,
            "CEDULA": cedula,
            "NOMBRE": nombre,
            "DIRECCION": direccion,
            "TELEFONO": tel1,
            "TELEFONO2": tel2,
            "EMPRESA": empresa,
            "DIRECCIONEMP": diremp,
            "SALDO": saldo,
            "NOTA": nota
        }
        cleaned_clients.append(item)

    print(f"Clientes preparados y normalizados: {len(cleaned_clients)}")

    url = "https://mlygtxblzdkkxixhetlh.supabase.co/rest/v1/CLIENTES"
    headers = {
        "apikey": "sb_publishable_QLvry_iRRdOWMQOXOG7y_w_RkVwUdrD",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    CHUNK_SIZE = 150
    total_insertados = 0

    for i in range(0, len(cleaned_clients), CHUNK_SIZE):
        chunk = cleaned_clients[i:i+CHUNK_SIZE]
        req = urllib.request.Request(url, data=json.dumps(chunk).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                total_insertados += len(chunk)
                print(f"Progreso: {total_insertados}/{len(cleaned_clients)} clientes insertados con éxito...")
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            print(f"Error en chunk {i}: {e.code} - {err_msg}")
        except Exception as e:
            print(f"Excepción en chunk {i}: {e}")
        time.sleep(0.05)

    print(f"=== FINALIZADO: {total_insertados} CLIENTES IMPORTADOS EXITOSAMENTE EN SUPABASE ===")

if __name__ == "__main__":
    import_clients()
