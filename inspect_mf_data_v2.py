import pandas as pd
import sys

def inspect_excel(file_path):
    try:
        df = pd.read_excel(file_path)
        print(f"--- Inspection for: {file_path} ---")
        print("Columns:", df.columns.tolist())
        print("\nFirst 3 rows:")
        print(df.head(3).to_string())
        print("\n")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    inspect_excel(r"f:\Coding\ETGenAIHackathon\test_data\mfs\kite_mutual_funds.xlsx")
    inspect_excel(r"f:\Coding\ETGenAIHackathon\test_data\Mutual_Funds_5047349890_23-03-2026_23-03-2026.xlsx")
