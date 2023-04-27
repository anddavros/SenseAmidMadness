#Adrress matching script

import tkinter as tk

class AddressMatchGUI:
    def __init__(self, master):
        self.master = master
        self.master.title("Cryptocurrency Address Matcher")
        self.master.geometry("400x200")

        # Create address entry fields
        self.address1_label = tk.Label(self.master, text="Address 1:")
        self.address1_label.pack()
        self.address1_entry = tk.Entry(self.master, width=40)
        self.address1_entry.pack()
        self.address2_label = tk.Label(self.master, text="Address 2:")
        self.address2_label.pack()
        self.address2_entry = tk.Entry(self.master, width=40)
        self.address2_entry.pack()

        # Create output window
        self.output_window = tk.Text(self.master, height=3, width=40)
        self.output_window.pack()

        # Check addresses on text input
        self.address1_entry.bind('<KeyRelease>', self.check_addresses)
        self.address2_entry.bind('<KeyRelease>', self.check_addresses)

    def check_addresses(self, event):
        address1 = self.address1_entry.get()
        address2 = self.address2_entry.get()

        if address1 == address2:
            self.output_window.delete('1.0', tk.END)
            self.output_window.insert(tk.END, "Addresses match!")
        else:
            self.output_window.delete('1.0', tk.END)
            self.output_window.insert(tk.END, "Addresses do not match.")

if __name__ == "__main__":
    root = tk.Tk()
    app = AddressMatchGUI(root)
    root.mainloop()
