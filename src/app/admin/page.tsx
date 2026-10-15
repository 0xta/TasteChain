"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
  RefreshCw,
  UtensilsCrossed,
  Coffee,
  Beer,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Coins,
} from "lucide-react";

interface StatsData {
  overall: {
    totalVenues: number;
    fbVenues: number;
    topRatedVenues: number;
    reviewedVenues: number;
    avgRating: string;
  };
  web3: {
    totalVerifiedReviews: number;
    totalPioneersClaimed: number;
    activeBounties: number;
  };
  serviceTypes: { type: string; count: number }[];
  ratingDistribution: { bucket: string; count: number }[];
}

interface PlaceItem {
  id: string;
  place_id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  service_type: string;
  rating: number | null;
  total_reviews: number | null;
  opening_hours: any;
  google_map_url: string;
  pioneer_count: number;
  review_count: number;
  has_active_bounty: boolean;
}

interface PlaceDetail {
  place: any;
  pioneers: any[];
  reviews: any[];
  bounties: any[];
}

export default function AdminDashboard() {
  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // List & Search state
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [sortBy, setSortBy] = useState("reviews_desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Theme state
  const [theme, setTheme] = useState("dark");

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch places
  const fetchPlaces = useCallback(async () => {
    try {
      setLoadingPlaces(true);
      const params = new URLSearchParams({
        search,
        type: selectedType,
        minRating,
        sortBy,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/places?${params.toString()}`);
      const data = await res.json();
      setPlaces(data.places || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to search places", err);
    } finally {
      setLoadingPlaces(false);
    }
  }, [search, selectedType, minRating, sortBy, page, limit]);

  // Fetch place detail
  const openDetail = async (placeId: string) => {
    setSelectedPlaceId(placeId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/places/${encodeURIComponent(placeId)}`);
      const data = await res.json();
      setPlaceDetail(data);
    } catch (err) {
      console.error("Failed to load detail", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedPlaceId(null);
    setPlaceDetail(null);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Quick District Filter Pill
  const applyQuickDistrict = (district: string) => {
    setSearch(district);
    setPage(1);
  };

  // Format Service Type Badge
  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case "cafe":
      case "coffee_shop":
        return <span className="badge badge-warning gap-1 text-xs"><Coffee className="w-3 h-3" /> {type}</span>;
      case "bar":
      case "night_club":
        return <span className="badge badge-secondary gap-1 text-xs"><Beer className="w-3 h-3" /> {type}</span>;
      case "noodle_shop":
      case "thai_restaurant":
      case "restaurant":
        return <span className="badge badge-accent gap-1 text-xs"><UtensilsCrossed className="w-3 h-3" /> {type}</span>;
      default:
        return <span className="badge badge-ghost text-xs">{type || "other"}</span>;
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Top Navbar */}
      <div className="navbar bg-base-200 border-b border-base-300 sticky top-0 z-30 px-4 lg:px-8">
        <div className="flex-1 gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight">TasteChain BKK</span>
              <span className="badge badge-sm badge-error font-mono">AVAX Fuji</span>
              <span className="badge badge-sm badge-outline">Admin Hub</span>
            </div>
            <p className="text-xs opacity-60">Bangkok Gastronomy Protocol Data Explorer</p>
          </div>
        </div>

        <div className="flex-none gap-2">
          {/* Quick Refresh */}
          <button
            onClick={() => {
              fetchStats();
              fetchPlaces();
            }}
            className="btn btn-sm btn-ghost gap-1"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPlaces ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Theme Selector */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-sm btn-outline">
              🎨 ธีม: <span className="capitalize">{theme}</span>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow-2xl bg-base-200 rounded-box w-36 border border-base-300"
            >
              <li><button onClick={() => changeTheme("dark")}>Dark (Def)</button></li>
              <li><button onClick={() => changeTheme("coffee")}>Coffee</button></li>
              <li><button onClick={() => changeTheme("cyberpunk")}>Cyberpunk</button></li>
              <li><button onClick={() => changeTheme("emerald")}>Emerald</button></li>
              <li><button onClick={() => changeTheme("light")}>Light</button></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* SECTION 1: OVERVIEW STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total BKK Venues */}
          <div className="card bg-base-200 border border-base-300 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold opacity-60">ร้านค้าใน กทม. ทั้งหมด</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl lg:text-3xl font-black mt-2 text-primary">
              {loadingStats ? "..." : stats?.overall.totalVenues.toLocaleString()}
            </div>
            <p className="text-xs opacity-50 mt-1">OPERATIONAL Status เท่านั้น</p>
          </div>

          {/* F&B Venues */}
          <div className="card bg-base-200 border border-base-300 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold opacity-60">ร้านอาหาร & เครื่องดื่ม (F&B)</span>
              <UtensilsCrossed className="w-4 h-4 text-warning" />
            </div>
            <div className="text-2xl lg:text-3xl font-black mt-2 text-warning">
              {loadingStats ? "..." : stats?.overall.fbVenues.toLocaleString()}
            </div>
            <p className="text-xs opacity-50 mt-1">คิดเป็น 87.4% ของร้านทั้งหมด</p>
          </div>

          {/* Top Rated (4.5+) */}
          <div className="card bg-base-200 border border-base-300 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold opacity-60">ร้านดาวสูง (⭐ 4.5 ขึ้นไป)</span>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-black mt-2 text-amber-400">
              {loadingStats ? "..." : stats?.overall.topRatedVenues.toLocaleString()}
            </div>
            <p className="text-xs opacity-50 mt-1">
              คะแนนเฉลี่ย: {stats?.overall.avgRating || "0.0"} / 5.0
            </p>
          </div>

          {/* Web3 Activity */}
          <div className="card bg-base-200 border border-base-300 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold opacity-60">Web3 Protocol Activity</span>
              <Award className="w-4 h-4 text-success" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-2xl lg:text-3xl font-black text-success">
                {loadingStats ? "..." : stats?.web3.totalVerifiedReviews}
              </div>
              <span className="text-xs opacity-70">รีวิวที่ Verify แล้ว</span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
              <span>🏆 Pioneers: {stats?.web3.totalPioneersClaimed || 0}</span>
              <span>•</span>
              <span>💰 Bounties: {stats?.web3.activeBounties || 0}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: SEARCH & FILTER CONTROLS */}
        <div className="card bg-base-200 border border-base-300 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 opacity-40" />
              <input
                type="text"
                placeholder="ค้นหาชื่อร้าน, เมนู, ถนน, หรือย่าน (เช่น ก๋วยเตี๋ยว, บรรทัดทอง, อารีย์, สุขุมวิท)..."
                className="input input-bordered w-full pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-3 opacity-40 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Service Type Filter */}
            <select
              className="select select-bordered"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">🍽️ ทุกหมวดหมู่ร้าน</option>
              <option value="restaurant">Restaurant (ร้านอาหาร)</option>
              <option value="cafe">Cafe (คาเฟ่)</option>
              <option value="bakery">Bakery (เบเกอรี่)</option>
              <option value="bar">Bar (บาร์)</option>
              <option value="coffee_shop">Coffee Shop (ร้านกาแฟ)</option>
              <option value="thai_restaurant">Thai Restaurant (อาหารไทย)</option>
              <option value="noodle_shop">Noodle Shop (ก๋วยเตี๋ยว)</option>
              <option value="japanese_restaurant">Japanese (อาหารญี่ปุ่น)</option>
              <option value="chinese_restaurant">Chinese (อาหารจีน)</option>
              <option value="fast_food_restaurant">Fast Food</option>
            </select>

            {/* Minimum Rating Filter */}
            <select
              className="select select-bordered"
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                setPage(1);
              }}
            >
              <option value="0">⭐ เรตติ้งทั้งหมด</option>
              <option value="4.0">⭐ 4.0 ขึ้นไป</option>
              <option value="4.5">⭐ 4.5 ขึ้นไป (เกรด A)</option>
              <option value="4.8">⭐ 4.8 ขึ้นไป (ระดับตำนาน)</option>
            </select>

            {/* Sort Order */}
            <select
              className="select select-bordered"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="reviews_desc">🔥 รีวิวเยอะสุดก่อน</option>
              <option value="rating_desc">⭐ คะแนนดาวสูงสุดก่อน</option>
              <option value="name_asc">🔤 เรียงตามชื่อ (A-Z, ก-ฮ)</option>
            </select>
          </div>

          {/* Quick District Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-base-300">
            <span className="opacity-60 flex items-center gap-1 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-primary" /> ย่านยอดนิยม:
            </span>
            {["บรรทัดทอง", "เยาวราช", "อารีย์", "ทรงวาด", "สุขุมวิท", "สีลม", "สยาม", "ทองหล่อ", "บางรัก", "เจริญกรุง"].map(
              (district) => (
                <button
                  key={district}
                  onClick={() => applyQuickDistrict(district)}
                  className={`btn btn-xs ${
                    search === district ? "btn-primary" : "btn-outline btn-ghost"
                  }`}
                >
                  {district}
                </button>
              )
            )}
          </div>
        </div>

        {/* SECTION 3: VENUES TABLE / LIST */}
        <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-base-300">
            <div className="flex items-center gap-2">
              <span className="font-bold">รายการร้านอาหาร</span>
              <span className="badge badge-sm badge-neutral">
                พบ {total.toLocaleString()} แห่ง
              </span>
              {loadingPlaces && <span className="loading loading-spinner loading-xs text-primary"></span>}
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-2 text-xs opacity-70">
              <span>แสดงแถว:</span>
              <select
                className="select select-xs select-bordered"
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>ชื่อร้าน (Venue Name)</th>
                  <th>หมวดหมู่</th>
                  <th>คะแนนดาว & รีวิว</th>
                  <th>ที่อยู่ / ย่าน</th>
                  <th>Pioneers (3 สล็อต)</th>
                  <th>Bounty</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {places.length === 0 && !loadingPlaces && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 opacity-50">
                      ไม่พบร้านอาหารที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
                {places.map((place, idx) => (
                  <tr key={place.id} className="hover">
                    <td className="opacity-40 text-xs">{(page - 1) * limit + idx + 1}</td>
                    <td>
                      <div className="font-semibold text-sm hover:text-primary cursor-pointer" onClick={() => openDetail(place.place_id)}>
                        {place.name}
                      </div>
                      <div className="text-[10px] opacity-40 font-mono truncate max-w-xs">
                        ID: {place.place_id}
                      </div>
                    </td>
                    <td>{getServiceTypeBadge(place.service_type)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold flex items-center text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                          {place.rating !== null ? place.rating.toFixed(1) : "-"}
                        </span>
                        {place.total_reviews ? (
                          <span className="text-[11px] opacity-50">
                            ({place.total_reviews.toLocaleString()})
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <p className="text-xs truncate max-w-xs opacity-75" title={place.address}>
                        {place.address || "-"}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {place.pioneer_count >= 3 ? (
                          <span className="badge badge-xs badge-neutral">3/3 เต็มแล้ว</span>
                        ) : (
                          <span className="badge badge-xs badge-success gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            {place.pioneer_count}/3 ว่าง
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {place.has_active_bounty ? (
                        <span className="badge badge-xs badge-error gap-0.5 font-bold">
                          <Coins className="w-2.5 h-2.5" /> มี Bounty
                        </span>
                      ) : (
                        <span className="text-[11px] opacity-30">-</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {place.google_map_url && (
                          <a
                            href={place.google_map_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-xs text-primary"
                            title="ดูบน Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => openDetail(place.place_id)}
                          className="btn btn-primary btn-xs"
                        >
                          ดูข้อมูล
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-base-300">
            <span className="text-xs opacity-60">
              แสดง {(page - 1) * limit + 1} - {Math.min(page * limit, total)} จากทั้งหมด {total.toLocaleString()} รายการ
            </span>

            <div className="join">
              <button
                className="join-item btn btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="join-item btn btn-sm btn-ghost pointer-events-none">
                หน้า {page} / {totalPages || 1}
              </button>
              <button
                className="join-item btn btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedPlaceId && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl bg-base-200 border border-base-300 shadow-2xl relative">
            <button
              onClick={closeDetail}
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
            >
              <X className="w-4 h-4" />
            </button>

            {loadingDetail ? (
              <div className="py-20 text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-3 text-xs opacity-50">กำลังดึงข้อมูลร้านและสถานะ On-chain...</p>
              </div>
            ) : placeDetail ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    {getServiceTypeBadge(placeDetail.place.service_type)}
                    <span className="badge badge-sm badge-outline">
                      {placeDetail.place.business_status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{placeDetail.place.name}</h3>
                  <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    {placeDetail.place.address}
                  </p>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-base-300/50 p-3 rounded-xl border border-base-300 text-center">
                  <div>
                    <span className="text-[10px] uppercase opacity-50 block font-semibold">คะแนนเรตติ้ง</span>
                    <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400" />
                      {placeDetail.place.rating ? placeDetail.place.rating.toFixed(1) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase opacity-50 block font-semibold">รีวิวทั้งหมด</span>
                    <span className="text-lg font-bold">
                      {placeDetail.place.total_reviews?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase opacity-50 block font-semibold">พิกัดละติจูด</span>
                    <span className="text-xs font-mono font-medium block mt-1">
                      {placeDetail.place.latitude?.toFixed(5) || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase opacity-50 block font-semibold">พิกัดลองจิจูด</span>
                    <span className="text-xs font-mono font-medium block mt-1">
                      {placeDetail.place.longitude?.toFixed(5) || "-"}
                    </span>
                  </div>
                </div>

                {/* Web3 Protocol Status (Pioneers & Bounties) */}
                <div className="card bg-base-100 border border-base-300 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-base-300 pb-2">
                    <span className="font-bold text-sm flex items-center gap-1.5 text-primary">
                      <Award className="w-4 h-4" /> สถานะผู้บุกเบิก (Pioneer Slots บน Avalanche)
                    </span>
                    <span className="badge badge-sm badge-neutral">
                      {placeDetail.pioneers.length}/3 สล็อต
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((slot) => {
                      const pioneer = placeDetail.pioneers.find((p: any) => p.slot_index === slot);
                      return (
                        <div
                          key={slot}
                          className={`p-2.5 rounded-lg border text-center ${
                            pioneer
                              ? "bg-success/10 border-success/30 text-success"
                              : "bg-base-200 border-dashed border-base-300 opacity-60"
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase">Slot #{slot}</div>
                          {pioneer ? (
                            <div className="mt-1">
                              <span className="text-[10px] font-mono block truncate" title={pioneer.pioneer_address}>
                                {pioneer.pioneer_address.slice(0, 6)}...{pioneer.pioneer_address.slice(-4)}
                              </span>
                              <span className="badge badge-xs badge-success mt-1">จองแล้ว</span>
                            </div>
                          ) : (
                            <div className="text-xs opacity-50 mt-1">ยังว่างอยู่</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Opening Hours if available */}
                {placeDetail.place.opening_hours &&
                  Object.keys(placeDetail.place.opening_hours).length > 0 && (
                    <div className="card bg-base-100 border border-base-300 p-3">
                      <span className="text-xs font-bold opacity-60 uppercase mb-2 block">
                        🕒 เวลาทำการ (Opening Hours)
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                        {Object.entries(placeDetail.place.opening_hours).map(([day, time]) => (
                          <div key={day} className="flex justify-between border-b border-base-300/40 py-0.5">
                            <span className="uppercase opacity-50">{day}:</span>
                            <span>{String(time)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actions & Links */}
                <div className="flex items-center justify-between pt-2 border-t border-base-300">
                  <div className="text-xs opacity-50 font-mono">
                    Place ID: {placeDetail.place.place_id}
                  </div>
                  <div className="flex items-center gap-2">
                    {placeDetail.place.google_map_url && (
                      <a
                        href={placeDetail.place.google_map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> ดูบน Google Maps
                      </a>
                    )}
                    <button onClick={closeDetail} className="btn btn-sm btn-primary">
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-error">ไม่พบข้อมูลร้าน</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
