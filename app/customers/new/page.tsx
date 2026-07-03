"use client";

import Link from "next/link";
import { useState } from "react";

export default function NewContact() {
  const [isCompany, setIsCompany] = useState(false);

  return (
    <div className="container-1140" style={{ maxWidth: 720 }}>
      <h1 className="page-title">Opret ny kontakt</h1>
      <p className="page-desc">En kontakt bliver til en kunde, når den har mindst én ordre eller ét abonnement.</p>

      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label>Kontakttype</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 300 }}>
              <input type="checkbox" checked={isCompany} onChange={(e) => setIsCompany(e.target.checked)} /> Virksomhed
            </label>
          </div>

          {isCompany && (
            <>
              <div className="form-group"><label>Virksomhedsnavn</label><input className="form-control" /></div>
              <div className="grid-2">
                <div className="form-group"><label>CVR-nummer</label><input className="form-control" /></div>
                <div className="form-group">
                  <label>EAN-nummer</label><input className="form-control" />
                  <small className="form-text">Faktura sendes elektronisk via EAN, såfremt et EAN-nummer er angivet.</small>
                </div>
              </div>
            </>
          )}

          <div className="form-group"><label>Navn</label><input className="form-control" /></div>
          <div className="grid-2">
            <div className="form-group"><label>E-mail</label><input className="form-control" type="email" /></div>
            <div className="form-group"><label>Telefon</label><input className="form-control" /></div>
          </div>
          <div className="form-group">
            <label>Adresse</label><input className="form-control" placeholder="Vejnavn husnr., postnr. by" />
          </div>
          <div className="form-group">
            <label>Adressebemærkning</label>
            <textarea className="form-control" />
            <small className="form-text">Internt notat, der relaterer sig til adressen (kontakten).</small>
          </div>

          <div className="savebar">
            <Link href="/customers" className="btn btn-light">Luk</Link>
            <button className="btn btn-primary" type="button">Opret kontakt</button>
          </div>
        </div>
      </div>
    </div>
  );
}
