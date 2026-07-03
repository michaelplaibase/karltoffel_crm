import Link from "next/link";
import { getFixedPrices } from "@/lib/queries";
import { CatChip, RowCaret, MapLink, money } from "@/components/ui";

export const metadata = { title: "Fastprisaftaler · Karltoffel" };

export default async function FixedPricesPage() {
  const agreements = await getFixedPrices();
  return (
    <div className="container-1140">
      <h1 className="page-title">Oversigt over fastprisaftaler</h1>
      <p className="page-desc">
        En fastprisaftale er knyttet til en leveringsadresse. Den anvendes for kunder, der ikke har et abonnement,
        f.eks., hvis man opretter en manuel ordre i kalenderen, eller hvis kunden afgiver en online bestilling.
      </p>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <Link href="/fixed-prices/new" className="btn btn-outline-primary">Opret ny fastprisaftale</Link>
            <div className="searchbar">
              <input className="form-control" placeholder="kundenavn, kundenr, email, tlf, vejnavn, husnr, postnr" />
              <button className="btn btn-light">Søg</button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }} /><th>Aftale nr.</th><th>Leveringsadresse</th><th>Opgaver</th><th>Pris</th>
                </tr>
              </thead>
              <tbody>
                {agreements.length === 0 ? (
                  <tr><td colSpan={5}><div className="table-empty">Ingen fastprisaftaler fundet</div></td></tr>
                ) : agreements.map((f) => (
                  <tr key={f.id}>
                    <td><RowCaret actions={["Rediger fastprisaftale", "Slet fastprisaftale…"]} /></td>
                    <td className="num"><Link href={`/fixed-prices/${f.id}`}>{f.id}</Link></td>
                    <td>{f.deliveryAddress}<div><MapLink address={f.deliveryAddress} /></div></td>
                    <td>{f.tasks.map((t, i) => <div key={i}><CatChip category={t.category} letter={t.letter} /> {t.description}</div>)}</td>
                    <td className="num">{f.tasks.map((t, i) => <div key={i}>{money(t.price)}</div>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
