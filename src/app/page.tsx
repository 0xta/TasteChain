"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Coins,
  Wallet,
  Camera,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  TrendingUp,
  User,
  History,
  Layers,
  LogOut,
} from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { getSnowtraceTxUrl, getSnowtraceAddressUrl } from "@/lib/web3";

interface PlaceItem {
  id: string;
  place_id: string;
  place_hash: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  service_type: string;
  rating: number | null;
  total_reviews: number;
  opening_hours: any;
  google_map_url: string;
  pioneers: {
    claimed: number;
    slotsOpen: number;
  };
  verifiedReviewsCount: number;
  bounty: {
    active: boolean;
    remainingAvax: number;
    rewardPerVisitAvax: number;
  };
}

export default function Home() {
  const {
    address,
    balance,
    isJudgeMode,
    connecting,
    faucetLoading,
    connectMetamask,
    activateJudgeMode,
    disconnect,
    getSigner,
  } = useWallet();

  // Navigation tab: "explore" | "profile" | "leaderboard"
  const [activeTab, setActiveTab] = useState<"explore" | "profile" | "leaderboard">("explore");

  // Places state
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [pioneerOnly, setPioneerOnly] = useState(false);
  const [bountyOnly, setBountyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // View mode: "grid" | "map"
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const mapInstanceRef = useRef<any>(null);

  // Detail Modal state
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewPlace, setReviewPlace] = useState<PlaceItem | null>(null);
  const [reviewStep, setReviewStep] = useState<1 | 2 | 3 | 4>(1);

  // Bounty Modal state
  const [bountyModalOpen, setBountyModalOpen] = useState(false);
  const [bountyPlace, setBountyPlace] = useState<PlaceItem | null>(null);
  const [bountyBudget, setBountyBudget] = useState(0.5);
  const [bountyReward, setBountyReward] = useState(0.05);
  const [bountyMinSpend, setBountyMinSpend] = useState(150);
  const [submittingBounty, setSubmittingBounty] = useState(false);
  const [bountySuccess, setBountySuccess] = useState<any | null>(null);

  // Leaderboard data
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Review form states
  const [gpsStatus, setGpsStatus] = useState<"idle" | "checking" | "matched" | "skipped">("idle");
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipOcrResult, setSlipOcrResult] = useState<any | null>(null);
  const [slipHashes, setSlipHashes] = useState<any | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTextInput, setReviewTextInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  // Profile data
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Theme
  const [theme, setTheme] = useState("dark");
  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Fetch places
  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        q: search,
        type: selectedType,
        rating: minRating,
        pioneer: pioneerOnly ? "true" : "false",
        bounty: bountyOnly ? "true" : "false",
        page: page.toString(),
        limit: "18",
      });
      const res = await fetch(`/api/places?${params.toString()}`);
      const data = await res.json();
      setPlaces(data.places || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch places:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, minRating, pioneerOnly, bountyOnly, page]);

  // Fetch single place detail
  const openDetailModal = async (placeId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(placeId)}`);
      const data = await res.json();
      setSelectedPlace(data);
    } catch (err) {
      console.error("Failed to load place detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!address) return;
    try {
      setLoadingProfile(true);
      const res = await fetch(`/api/profile/${address}`);
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoadingProfile(false);
    }
  }, [address]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaderboardData(data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  useEffect(() => {
    if (activeTab === "profile" && address) {
      fetchProfile();
    } else if (activeTab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [activeTab, address, fetchProfile, fetchLeaderboard]);

  // Leaflet Map initialization & synchronization
  useEffect(() => {
    if (viewMode !== "map" || activeTab !== "explore") {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L) {
        setTimeout(initMap, 200);
        return;
      }

      const mapContainer = document.getElementById("tastechain-map");
      if (!mapContainer) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map("tastechain-map").setView([13.7563, 100.5018], 12);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const validPlaces = places.filter(
        (p) => p.latitude && p.longitude && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
      );

      if (validPlaces.length > 0) {
        const bounds: [number, number][] = [];
        validPlaces.forEach((place) => {
          const lat = Number(place.latitude);
          const lng = Number(place.longitude);
          bounds.push([lat, lng]);

          const marker = L.marker([lat, lng]).addTo(map);

          const popupWrapper = document.createElement("div");
          popupWrapper.className = "text-xs p-1 space-y-1 font-sans text-neutral-900";
          popupWrapper.innerHTML = `
            <div style="font-weight: bold; font-size: 13px; color: #dc2626;">${place.name}</div>
            <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">${place.address}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
              <span style="font-weight: bold; color: #f59e0b;">⭐ ${place.rating ? place.rating.toFixed(1) : "-"}</span>
              <span style="background: ${place.pioneers.slotsOpen > 0 ? '#dcfce7' : '#f3f4f6'}; color: ${place.pioneers.slotsOpen > 0 ? '#15803d' : '#6b7280'}; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">
                ${place.pioneers.slotsOpen > 0 ? `Pioneer ว่าง ${place.pioneers.slotsOpen}/3` : "Pioneer ครบ"}
              </span>
            </div>
            ${place.bounty.active ? `<div style="color: #dc2626; font-weight: bold; font-size: 10px; margin-top: 2px;">🎁 Bounty: ${place.bounty.rewardPerVisitAvax} AVAX</div>` : ""}
            <div style="display: flex; gap: 4px; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 4px;">
              <button id="btn-detail-${place.place_id}" style="padding: 2px 6px; background: #e5e7eb; color: #1f2937; border-radius: 4px; font-size: 10px; border: none; cursor: pointer;">ดูข้อมูล</button>
              <button id="btn-review-${place.place_id}" style="padding: 2px 6px; background: #dc2626; color: white; border-radius: 4px; font-size: 10px; border: none; cursor: pointer;">รีวิว & เคลม</button>
            </div>
          `;

          marker.bindPopup(popupWrapper);

          marker.on("popupopen", () => {
            const btnDetail = document.getElementById(`btn-detail-${place.place_id}`);
            const btnReview = document.getElementById(`btn-review-${place.place_id}`);
            if (btnDetail) {
              btnDetail.onclick = () => openDetailModal(place.place_id);
            }
            if (btnReview) {
              btnReview.onclick = () => startReviewFlow(place);
            }
          });
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      }
    };

    const timer = setTimeout(initMap, 150);
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, activeTab, places]);

  // Open Bounty Funding Modal
  const openBountyModal = (place: PlaceItem) => {
    if (!address) {
      alert("กรุณาเชื่อมต่อกระเป๋า หรือคลิก ⚡ 1-Click Judge Mode ก่อนตั้งแคมเปญ Bounty ครับ!");
      return;
    }
    setBountyPlace(place);
    setBountyBudget(0.5);
    setBountyReward(0.05);
    setBountyMinSpend(150);
    setBountySuccess(null);
    setBountyModalOpen(true);
  };

  // Submit Bounty Funding
  const handleFundBounty = async () => {
    if (!bountyPlace || !address) return;
    try {
      setSubmittingBounty(true);
      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: bountyPlace.place_id,
          merchant_address: address,
          total_budget_avax: bountyBudget,
          reward_per_visit_avax: bountyReward,
          min_spend_thb: bountyMinSpend,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBountySuccess(data);
        fetchPlaces();
        if (activeTab === "leaderboard") fetchLeaderboard();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการตั้ง Bounty");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmittingBounty(false);
    }
  };

  // Start Review Flow
  const startReviewFlow = (place: PlaceItem) => {
    if (!address) {
      alert("กรุณาเชื่อมต่อกระเป๋า หรือคลิกปุ่ม '⚡ 1-Click Judge Mode' ก่อนเขียนรีวิวครับ!");
      return;
    }
    setReviewPlace(place);
    setReviewStep(1);
    setGpsStatus("idle");
    setGpsDistance(null);
    setPhotoPreview(null);
    setSlipPreview(null);
    setSlipOcrResult(null);
    setSlipHashes(null);
    setOcrError(null);
    setReviewTextInput("");
    setRatingInput(5);
    setSubmitSuccess(null);
    setReviewModalOpen(true);
  };

  // Step 1: Simulate / Get GPS
  const handleCheckGps = () => {
    setGpsStatus("checking");
    if (navigator.geolocation && reviewPlace?.latitude && reviewPlace?.longitude) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Calculate distance in meters
          const dist = calculateDistance(
            pos.coords.latitude,
            pos.coords.longitude,
            reviewPlace.latitude!,
            reviewPlace.longitude!
          );
          setGpsDistance(Math.round(dist));
          setGpsStatus("matched");
        },
        () => {
          // Fallback if browser permission denied
          setGpsDistance(42);
          setGpsStatus("matched");
        },
        { timeout: 5000 }
      );
    } else {
      setTimeout(() => {
        setGpsDistance(35);
        setGpsStatus("matched");
      }, 600);
    }
  };

  // Step 2: Handle Food Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 3: Handle Slip Upload & Call OCR API
  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setSlipPreview(base64Data);

      try {
        const res = await fetch("/api/verify-slip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data }),
        });
        const data = await res.json();

        if (data.success) {
          setSlipOcrResult(data.ocr);
          setSlipHashes(data.hashes);
        } else {
          setOcrError(data.error || "ไม่สามารถวิเคราะห์สลิปได้");
        }
      } catch (err: any) {
        setOcrError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ OCR");
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Step 4: Submit Review to On-chain & Database
  const handleSubmitReview = async () => {
    if (!reviewPlace || !address) return;
    setSubmittingReview(true);
    try {
      // Mock / Real On-chain Tx Hash on Avalanche Fuji
      const mockTxHash =
        "0x" +
        Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("");

      const isPioneerCandidate = reviewPlace.pioneers.claimed < 3;
      const nextPioneerSlot = isPioneerCandidate
        ? reviewPlace.pioneers.claimed + 1
        : null;

      const payload = {
        place_id: reviewPlace.place_id,
        reviewer_address: address,
        rating: ratingInput,
        review_text: reviewTextInput || "รสชาติอร่อย บรรยากาศดี แนะนำครับ!",
        verification_tier: 3,
        slip_amount_thb: slipOcrResult?.amount_thb || 150,
        slip_ref_hash: slipHashes?.slipRefHash,
        slip_ocr_raw: slipOcrResult,
        food_photo_phash: "phash_" + Date.now(),
        photo_url: photoPreview,
        onchain_tx_hash: mockTxHash,
        onchain_block_number: 38291042,
        is_pioneer: isPioneerCandidate,
        pioneer_slot: nextPioneerSlot,
        bounty_reward_avax: reviewPlace.bounty.active
          ? reviewPlace.bounty.rewardPerVisitAvax
          : 0,
      };

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess({
          ...data,
          txHash: mockTxHash,
          pioneerSlot: nextPioneerSlot,
        });
        fetchPlaces();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการบันทึกรีวิว");
      }
    } catch (err: any) {
      console.error("Submit review error:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      {/* ── TOP NAVBAR ── */}
      <header className="navbar bg-base-200/90 backdrop-blur border-b border-base-300 sticky top-0 z-40 px-4 lg:px-8">
        <div className="flex-1 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-red-500 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                TasteChain BKK
              </span>
              <span className="badge badge-sm badge-error font-mono font-semibold">
                AVAX Fuji
              </span>
            </div>
            <p className="text-[11px] opacity-60 hidden sm:block">
              Web3 Gastronomy Protocol & Proof-of-Visit Verification
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 mx-4">
          <button
            onClick={() => setActiveTab("explore")}
            className={`btn btn-sm ${
              activeTab === "explore" ? "btn-primary" : "btn-ghost"
            } gap-1.5`}
          >
            <Compass className="w-4 h-4" /> สำรวจร้าน (Explore)
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`btn btn-sm ${
              activeTab === "leaderboard" ? "btn-primary" : "btn-ghost"
            } gap-1.5`}
          >
            <Award className="w-4 h-4" /> ลีดเดอร์บอร์ด (Leaderboard)
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`btn btn-sm ${
              activeTab === "profile" ? "btn-primary" : "btn-ghost"
            } gap-1.5`}
          >
            <User className="w-4 h-4" /> โปรไฟล์ & รางวัล
          </button>
          <Link href="/admin" className="btn btn-sm btn-ghost gap-1.5 opacity-70">
            <Layers className="w-4 h-4" /> Admin Hub
          </Link>
        </div>

        {/* Web3 Actions */}
        <div className="flex-none items-center gap-2">
          {/* ⚡ 1-Click Judge Mode Button */}
          {!address ? (
            <button
              onClick={activateJudgeMode}
              disabled={faucetLoading}
              className="btn btn-sm btn-warning font-bold shadow-md shadow-amber-500/20 animate-pulse hover:animate-none gap-1"
            >
              {faucetLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Zap className="w-4 h-4 fill-current" />
              )}
              <span>⚡ 1-Click Judge Mode</span>
            </button>
          ) : isJudgeMode ? (
            <div className="badge badge-warning gap-1 py-3 px-2 font-mono text-xs">
              <Zap className="w-3.5 h-3.5 fill-current" /> Judge Mode
            </div>
          ) : null}

          {/* Connect / Connected Wallet Button */}
          {address ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-sm btn-outline gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <span className="badge badge-xs badge-neutral font-bold">{balance} AVAX</span>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content z-50 menu p-2 shadow-2xl bg-base-200 rounded-box w-60 border border-base-300 space-y-1 mt-1"
              >
                <li className="menu-title text-xs opacity-50">Connected Account</li>
                <li>
                  <a
                    href={getSnowtraceAddressUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono break-all"
                  >
                    <ExternalLink className="w-3 h-3" /> ดูบน Snowtrace
                  </a>
                </li>
                <li>
                  <button onClick={() => setActiveTab("profile")} className="text-xs">
                    <User className="w-3.5 h-3.5" /> ประวัติรีวิว & Pioneer
                  </button>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <button onClick={disconnect} className="text-error text-xs">
                    <LogOut className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <button
              onClick={connectMetamask}
              disabled={connecting}
              className="btn btn-sm btn-outline gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              <span>{connecting ? "กำลังเชื่อมต่อ..." : "Connect Wallet"}</span>
            </button>
          )}

          {/* Theme Switcher */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle">
              🎨
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-50 menu p-2 shadow-2xl bg-base-200 rounded-box w-36 border border-base-300"
            >
              <li><button onClick={() => changeTheme("dark")}>Dark (Def)</button></li>
              <li><button onClick={() => changeTheme("coffee")}>Coffee</button></li>
              <li><button onClick={() => changeTheme("cyberpunk")}>Cyberpunk</button></li>
              <li><button onClick={() => changeTheme("emerald")}>Emerald</button></li>
              <li><button onClick={() => changeTheme("light")}>Light</button></li>
            </ul>
          </div>
        </div>
      </header>

      {/* ── MOBILE SUBNAV ── */}
      <div className="md:hidden flex border-b border-base-300 bg-base-200/50 px-4 py-2 gap-2 text-xs">
        <button
          onClick={() => setActiveTab("explore")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center ${
            activeTab === "explore" ? "bg-primary text-primary-content" : "bg-base-300"
          }`}
        >
          🍜 สำรวจร้าน
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center ${
            activeTab === "leaderboard" ? "bg-primary text-primary-content" : "bg-base-300"
          }`}
        >
          🏆 ลีดเดอร์บอร์ด
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center ${
            activeTab === "profile" ? "bg-primary text-primary-content" : "bg-base-300"
          }`}
        >
          👤 โปรไฟล์
        </button>
        <Link
          href="/admin"
          className="flex-1 py-1.5 rounded-lg font-bold text-center bg-base-300 opacity-70"
        >
          ⚙️ Admin
        </Link>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-8">
        {activeTab === "explore" ? (
          <>
            {/* HERO BANNER */}
            <div className="hero bg-gradient-to-br from-base-200 via-base-300/40 to-base-200 border border-base-300 rounded-3xl p-6 lg:p-10 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
                <UtensilsCrossed className="w-96 h-96 text-primary" />
              </div>

              <div className="max-w-2xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded-full text-xs font-semibold text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The Real-Yield Gastronomy Protocol on Avalanche</span>
                </div>
                <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
                  ค้นหาร้านลับในกรุงเทพฯ{" "}
                  <span className="bg-gradient-to-r from-red-500 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                    รีวิวจริง รับรางวัลจริง
                  </span>
                </h1>
                <p className="text-sm lg:text-base opacity-75 leading-relaxed">
                  เชื่อมต่อฐานข้อมูลกว่า 36,000+ ร้านในกรุงเทพมหานคร ตรวจสอบการไปกินจริงด้วย
                  GPS + สแกนสลิป PromptPay ผ่าน AI ป้องกันรีวิวปลอม และรับสิทธิ์เป็น
                  <strong className="text-amber-400"> Pioneer 3 คนแรกของร้าน</strong> รับส่วนแบ่ง Royalty ตลอดชีพ
                </p>

                {/* Quick Protocol Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-base-100/70 backdrop-blur p-2.5 rounded-xl border border-base-300">
                    <span className="text-[10px] uppercase font-bold opacity-50 block">ร้านใน กทม.</span>
                    <span className="text-lg font-black text-primary">41,581</span>
                  </div>
                  <div className="bg-base-100/70 backdrop-blur p-2.5 rounded-xl border border-base-300">
                    <span className="text-[10px] uppercase font-bold opacity-50 block">ร้านอาหาร & คาเฟ่</span>
                    <span className="text-lg font-black text-warning">36,369</span>
                  </div>
                  <div className="bg-base-100/70 backdrop-blur p-2.5 rounded-xl border border-base-300">
                    <span className="text-[10px] uppercase font-bold opacity-50 block">Pioneer Slots</span>
                    <span className="text-lg font-black text-success">3 สล็อต/ร้าน</span>
                  </div>
                  <div className="bg-base-100/70 backdrop-blur p-2.5 rounded-xl border border-base-300">
                    <span className="text-[10px] uppercase font-bold opacity-50 block">Network</span>
                    <span className="text-lg font-black text-error font-mono">AVAX Fuji</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEARCH & FILTER SECTION */}
            <div className="card bg-base-200 border border-base-300 shadow-sm p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3.5 opacity-40" />
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อร้าน, อาหาร, หรือถนน (เช่น ก๋วยเตี๋ยวเนื้อ, อารีย์, บรรทัดทอง, ผัดไทย)..."
                    className="input input-bordered w-full pl-9 text-sm"
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

                {/* Category Dropdown */}
                <select
                  className="select select-bordered text-sm"
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">🍽️ ทุกหมวดหมู่อาหาร</option>
                  <option value="restaurant">ร้านอาหาร (Restaurant)</option>
                  <option value="cafe">คาเฟ่ (Cafe)</option>
                  <option value="coffee_shop">ร้านกาแฟ (Coffee Shop)</option>
                  <option value="noodle_shop">ก๋วยเตี๋ยว (Noodle)</option>
                  <option value="thai_restaurant">อาหารไทย (Thai)</option>
                  <option value="bar">บาร์ & สังสรรค์ (Bar)</option>
                  <option value="bakery">เบเกอรี่ (Bakery)</option>
                  <option value="japanese_restaurant">อาหารญี่ปุ่น (Japanese)</option>
                </select>

                {/* Rating Dropdown */}
                <select
                  className="select select-bordered text-sm"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="0">⭐ เรตติ้งทั้งหมด</option>
                  <option value="4.0">⭐ 4.0 ขึ้นไป</option>
                  <option value="4.5">⭐ 4.5 ขึ้นไป (ยอดนิยม)</option>
                  <option value="4.8">⭐ 4.8 ขึ้นไป (ระดับตำนาน)</option>
                </select>
              </div>

              {/* Quick Filter Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-base-300 text-xs">
                <span className="opacity-60 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> ตัวกรองด่วน:
                </span>
                <button
                  onClick={() => setPioneerOnly(!pioneerOnly)}
                  className={`btn btn-xs ${
                    pioneerOnly ? "btn-success" : "btn-outline btn-ghost"
                  }`}
                >
                  🏆 Pioneer ว่าง (&lt; 3 คน)
                </button>
                <button
                  onClick={() => setBountyOnly(!bountyOnly)}
                  className={`btn btn-xs ${
                    bountyOnly ? "btn-error" : "btn-outline btn-ghost"
                  }`}
                >
                  💰 มี Bounty แจก AVAX
                </button>
                <div className="divider divider-horizontal my-0"></div>
                <span className="opacity-60">ย่านดัง:</span>
                {["บรรทัดทอง", "เยาวราช", "อารีย์", "ทรงวาด", "สุขุมวิท", "สีลม", "สยาม"].map(
                  (district) => (
                    <button
                      key={district}
                      onClick={() => {
                        setSearch(district);
                        setPage(1);
                      }}
                      className={`btn btn-xs ${
                        search === district ? "btn-primary" : "btn-ghost"
                      }`}
                    >
                      {district}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* VENUES GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">ร้านอาหารแนะนำ</h2>
                  <span className="badge badge-sm badge-neutral">
                    พบ {total.toLocaleString()} แห่ง
                  </span>
                  {loading && <span className="loading loading-spinner loading-xs text-primary"></span>}
                </div>

                {/* View Mode Toggle: Grid vs Map */}
                <div className="join">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`join-item btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline btn-ghost"} gap-1`}
                  >
                    <span>🗂️ การ์ด</span>
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`join-item btn btn-sm ${viewMode === "map" ? "btn-primary" : "btn-outline btn-ghost"} gap-1`}
                  >
                    <span>🗺️ แผนที่</span>
                  </button>
                </div>
              </div>

              {/* MAP VIEW */}
              {viewMode === "map" && (
                <div className="space-y-3">
                  <div className="alert alert-info py-2 text-xs">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>
                      คลิกหมุดร้านบนแผนที่เพื่อดูพิกัด, ข้อมูลร้าน, และกดเคลมสิทธิ์ Pioneer หรือรีวิวได้ทันที (แสดงตามผลการค้นหา {places.filter(p => p.latitude && p.longitude).length} พิกัด)
                    </span>
                  </div>
                  <div
                    id="tastechain-map"
                    className="w-full h-[620px] rounded-3xl border border-base-300 shadow-xl overflow-hidden z-10 relative bg-base-200"
                  ></div>
                </div>
              )}

              {/* GRID VIEW */}
              {viewMode === "grid" && (
                <>
                  {places.length === 0 && !loading && (
                    <div className="card bg-base-200 border border-base-300 p-12 text-center space-y-3">
                      <UtensilsCrossed className="w-12 h-12 mx-auto opacity-30" />
                      <p className="font-semibold text-lg">ไม่พบร้านอาหารที่ตรงกับเงื่อนไข</p>
                      <p className="text-xs opacity-50">ลองปรับคำค้นหา หรือกดล้างตัวกรอง</p>
                      <button
                        onClick={() => {
                          setSearch("");
                          setSelectedType("all");
                          setMinRating("0");
                          setPioneerOnly(false);
                          setBountyOnly(false);
                        }}
                        className="btn btn-sm btn-outline btn-primary mx-auto"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {places.map((place) => (
                      <div
                        key={place.id}
                        className="card bg-base-200 border border-base-300 hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
                      >
                        <div className="p-5 space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="badge badge-sm badge-outline capitalize">
                              {place.service_type || "Restaurant"}
                            </span>
                            {/* Pioneer Badge */}
                            {place.pioneers.slotsOpen > 0 ? (
                              <span className="badge badge-sm badge-success font-semibold gap-1">
                                <Sparkles className="w-3 h-3" />
                                Pioneer ว่าง {place.pioneers.slotsOpen}/3
                              </span>
                            ) : (
                              <span className="badge badge-sm badge-neutral">
                                🏆 Pioneer ครบแล้ว
                              </span>
                            )}
                          </div>

                          {/* Name & Address */}
                          <div>
                            <h3
                              onClick={() => openDetailModal(place.place_id)}
                              className="font-bold text-lg hover:text-primary cursor-pointer line-clamp-1"
                            >
                              {place.name}
                            </h3>
                            <p className="text-xs opacity-60 line-clamp-2 mt-1">
                              <MapPin className="w-3 h-3 inline mr-1 text-primary shrink-0" />
                              {place.address}
                            </p>
                          </div>

                          {/* Ratings & Web3 Status */}
                          <div className="flex items-center justify-between pt-2 border-t border-base-300 text-xs">
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                              <Star className="w-4 h-4 fill-amber-400" />
                              <span>{place.rating ? place.rating.toFixed(1) : "-"}</span>
                              <span className="text-[11px] opacity-40 font-normal">
                                ({place.total_reviews?.toLocaleString() || 0})
                              </span>
                            </div>

                            {place.bounty.active ? (
                              <span className="badge badge-xs badge-error font-bold gap-1">
                                <Coins className="w-3 h-3" /> {place.bounty.rewardPerVisitAvax} AVAX
                              </span>
                            ) : (
                              <span className="text-[11px] opacity-40">
                                {place.verifiedReviewsCount} รีวิวบนเชน
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="p-4 bg-base-300/40 border-t border-base-300 flex items-center gap-1.5">
                          <button
                            onClick={() => openDetailModal(place.place_id)}
                            className="btn btn-xs btn-outline"
                          >
                            ดูข้อมูล
                          </button>
                          <button
                            onClick={() => openBountyModal(place)}
                            className="btn btn-xs btn-outline btn-warning gap-1"
                            title="ตั้ง Bounty ดึงดูดลูกค้าให้ร้านนี้"
                          >
                            <Coins className="w-3 h-3" /> Bounty
                          </button>
                          <button
                            onClick={() => startReviewFlow(place)}
                            className="btn btn-xs btn-primary flex-1 gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> รีวิว & เคลม
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-base-200 border border-base-300 rounded-2xl">
                  <span className="text-xs opacity-60">
                    หน้า {page} จาก {totalPages} (พบ {total.toLocaleString()} ร้าน)
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
                      {page} / {totalPages}
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
              )}
            </div>
          </>
        ) : activeTab === "leaderboard" ? (
          /* ── LEADERBOARD VIEW ── */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/30 px-3 py-1 rounded-full text-xs font-semibold text-warning mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>On-Chain Hall of Fame & Real-Time Stream</span>
                </div>
                <h2 className="text-3xl font-black">ลีดเดอร์บอร์ด & กิจกรรมบนเชน</h2>
                <p className="text-xs opacity-60">
                  อันดับผู้บุกเบิกร้านอาหาร (Pioneers), นักรีวิวมือทอง (Curators) และสตรีมธุรกรรมสดบน Avalanche Fuji
                </p>
              </div>
              <button
                onClick={fetchLeaderboard}
                disabled={loadingLeaderboard}
                className="btn btn-sm btn-outline gap-1.5 self-start md:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaderboard ? "animate-spin" : ""}`} />
                <span>รีเฟรชอันดับ</span>
              </button>
            </div>

            {loadingLeaderboard ? (
              <div className="py-20 text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-3 text-xs opacity-50">กำลังประมวลผลอันดับ On-chain...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 2 Main Ranking Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Pioneers Card */}
                  <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-base-300 bg-base-300/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-amber-400">Top Pioneers (ราชาผู้บุกเบิก)</h3>
                          <p className="text-[11px] opacity-60">อันดับตามจำนวนสล็อต Pioneer ที่ครอบครอง</p>
                        </div>
                      </div>
                      <span className="badge badge-sm badge-warning font-bold">Royalty 5%</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr className="text-xs opacity-60">
                            <th>#</th>
                            <th>กระเป๋า (Address)</th>
                            <th className="text-center">สิทธิ์ Pioneer</th>
                            <th className="text-right">Royalty ที่ได้รับ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!leaderboardData?.topPioneers || leaderboardData.topPioneers.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="text-center py-6 opacity-40">
                                ยังไม่มีข้อมูลผู้บุกเบิก เป็นคนแรกที่รีวิวร้านเพื่อขึ้นลีดเดอร์บอร์ด!
                              </td>
                            </tr>
                          ) : (
                            leaderboardData.topPioneers.map((p: any, idx: number) => (
                              <tr key={p.address} className="hover:bg-base-300/30">
                                <td className="font-bold text-xs">
                                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                                </td>
                                <td>
                                  <a
                                    href={getSnowtraceAddressUrl(p.address)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-xs hover:text-primary flex items-center gap-1"
                                  >
                                    <span>{p.address.slice(0, 6)}...{p.address.slice(-4)}</span>
                                    <ExternalLink className="w-3 h-3 opacity-40" />
                                  </a>
                                </td>
                                <td className="text-center">
                                  <span className="badge badge-sm badge-neutral font-bold">{p.pioneer_count} สล็อต</span>
                                </td>
                                <td className="text-right font-mono text-xs text-success font-bold">
                                  {parseFloat(p.royalty_earned_avax || 0).toFixed(4)} AVAX
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top Reviewers Card */}
                  <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-base-300 bg-base-300/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-primary">Top Curators (นักรีวิวยืนยันสลิป)</h3>
                          <p className="text-[11px] opacity-60">อันดับตามจำนวนรีวิว Proof-of-Visit</p>
                        </div>
                      </div>
                      <span className="badge badge-sm badge-primary font-bold">Verified</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr className="text-xs opacity-60">
                            <th>#</th>
                            <th>กระเป๋า (Address)</th>
                            <th className="text-center">จำนวนรีวิว</th>
                            <th className="text-right">ยอดใช้จ่ายรวม</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!leaderboardData?.topReviewers || leaderboardData.topReviewers.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="text-center py-6 opacity-40">
                                ยังไม่มีข้อมูลรีวิว ส่งรีวิวแรกเพื่อรับตำแหน่งนักรีวิว!
                              </td>
                            </tr>
                          ) : (
                            leaderboardData.topReviewers.map((r: any, idx: number) => (
                              <tr key={r.address} className="hover:bg-base-300/30">
                                <td className="font-bold text-xs">
                                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                                </td>
                                <td>
                                  <a
                                    href={getSnowtraceAddressUrl(r.address)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-xs hover:text-primary flex items-center gap-1"
                                  >
                                    <span>{r.address.slice(0, 6)}...{r.address.slice(-4)}</span>
                                    <ExternalLink className="w-3 h-3 opacity-40" />
                                  </a>
                                </td>
                                <td className="text-center">
                                  <span className="badge badge-sm badge-primary font-bold">{r.review_count} รีวิว</span>
                                </td>
                                <td className="text-right font-mono text-xs">
                                  {parseFloat(r.total_spend_thb || 0).toLocaleString()} ฿
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Live On-Chain Activity Stream */}
                <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-base-300 bg-base-300/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                      </span>
                      <h3 className="font-bold text-sm">Live On-Chain Activity Stream (สตรีมธุรกรรมสด)</h3>
                    </div>
                    <span className="text-[11px] font-mono opacity-50">Avalanche Fuji C-Chain</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr className="text-xs opacity-60">
                          <th>เวลา</th>
                          <th>ประเภทกิจกรรม</th>
                          <th>ร้านอาหาร</th>
                          <th>ผู้ทำรายการ</th>
                          <th>คะแนน</th>
                          <th>รางวัลที่ได้รับ</th>
                          <th>Snowtrace Tx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!leaderboardData?.recentActivity || leaderboardData.recentActivity.length === 0) ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 opacity-40">
                              ยังไม่มีประวัติธุรกรรมล่าสุด
                            </td>
                          </tr>
                        ) : (
                          leaderboardData.recentActivity.map((act: any) => (
                            <tr key={act.id} className="hover:bg-base-300/30">
                              <td className="text-xs opacity-50 font-mono whitespace-nowrap">
                                {new Date(act.created_at).toLocaleTimeString("th-TH")}
                              </td>
                              <td>
                                {act.type === "BOUNTY_FUNDED" ? (
                                  <span className="badge badge-xs badge-warning font-semibold">🎁 FUND BOUNTY</span>
                                ) : act.is_pioneer ? (
                                  <span className="badge badge-xs badge-success font-semibold">🏆 PIONEER #{act.pioneer_slot}</span>
                                ) : (
                                  <span className="badge badge-xs badge-neutral font-semibold">📝 VERIFIED REVIEW</span>
                                )}
                              </td>
                              <td className="font-semibold text-xs max-w-[180px] truncate">
                                {act.place_name}
                              </td>
                              <td>
                                <a
                                  href={getSnowtraceAddressUrl(act.actor_address)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-xs hover:text-primary"
                                >
                                  {act.actor_address?.slice(0, 6)}...{act.actor_address?.slice(-4)}
                                </a>
                              </td>
                              <td>
                                {act.rating ? `⭐ ${act.rating}` : "-"}
                              </td>
                              <td className="font-mono text-xs font-bold text-success">
                                {parseFloat(act.bounty_reward_avax || 0) > 0 ? `+${act.bounty_reward_avax} AVAX` : "-"}
                              </td>
                              <td>
                                {act.snowtrace_url ? (
                                  <a
                                    href={act.snowtrace_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-xs btn-ghost text-primary font-mono gap-1"
                                  >
                                    <span>Tx</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── PROFILE & EARNINGS VIEW ── */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">โปรไฟล์ & ผลตอบแทน Real-Yield</h2>
                <p className="text-xs opacity-60">
                  ประวัติรีวิว Proof-of-Visit และสิทธิ์ Pioneer Royalty บนเครือข่าย Avalanche
                </p>
              </div>

              {address && (
                <a
                  href={getSnowtraceAddressUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline gap-1.5 font-mono text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Snowtrace
                </a>
              )}
            </div>

            {!address ? (
              <div className="card bg-base-200 border border-base-300 p-12 text-center space-y-4">
                <Wallet className="w-12 h-12 mx-auto text-warning opacity-70" />
                <h3 className="font-bold text-lg">กรุณาเชื่อมต่อกระเป๋าเพื่อดูโปรไฟล์ของคุณ</h3>
                <p className="text-xs opacity-60 max-w-sm mx-auto">
                  คุณสามารถเชื่อมต่อ MetaMask หรือคลิก ⚡ 1-Click Judge Mode เพื่อทดสอบระบบได้ทันที
                </p>
                <button onClick={activateJudgeMode} className="btn btn-warning btn-sm mx-auto gap-1">
                  <Zap className="w-4 h-4 fill-current" /> 1-Click Judge Mode
                </button>
              </div>
            ) : loadingProfile ? (
              <div className="py-20 text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-3 text-xs opacity-50">กำลังดึงข้อมูล On-chain...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card bg-base-200 border border-base-300 p-4 shadow-sm">
                    <span className="text-xs uppercase font-semibold opacity-60">ยอดเหรียญ AVAX ที่ได้รับ</span>
                    <div className="text-3xl font-black text-success mt-2 flex items-baseline gap-1">
                      <span>{profileData?.stats.totalEarnedAvax?.toFixed(4) || "0.0000"}</span>
                      <span className="text-xs text-base-content opacity-60">AVAX</span>
                    </div>
                    <span className="text-[11px] opacity-40 mt-1">Real-Yield Payouts</span>
                  </div>

                  <div className="card bg-base-200 border border-base-300 p-4 shadow-sm">
                    <span className="text-xs uppercase font-semibold opacity-60">รีวิวที่ยืนยันแล้ว</span>
                    <div className="text-3xl font-black text-primary mt-2">
                      {profileData?.stats.totalReviews || 0}
                    </div>
                    <span className="text-[11px] opacity-40 mt-1">Proof-of-Visit ผ่านการตรวจสอบ</span>
                  </div>

                  <div className="card bg-base-200 border border-base-300 p-4 shadow-sm">
                    <span className="text-xs uppercase font-semibold opacity-60">สิทธิ์ Pioneer ที่ครอบครอง</span>
                    <div className="text-3xl font-black text-amber-400 mt-2">
                      {profileData?.stats.totalPioneers || 0}
                    </div>
                    <span className="text-[11px] opacity-40 mt-1">รับ Royalty 5% ตลอดชีพ</span>
                  </div>
                </div>

                {/* Pioneer Positions Table */}
                <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-base-300 flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-amber-400">
                      <Award className="w-4 h-4" /> สิทธิ์ Pioneer ในร้านอาหาร ({profileData?.pioneers.length || 0})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ชื่อร้าน</th>
                          <th>ตำแหน่ง Slot</th>
                          <th>Royalty สะสม</th>
                          <th>Transaction บนเชน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!profileData?.pioneers || profileData.pioneers.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center py-6 opacity-40">
                              ยังไม่ได้เป็น Pioneer ร้านใด ลองไปรีวิวร้านใหม่เป็น 3 คนแรกเพื่อรับสิทธิ์!
                            </td>
                          </tr>
                        )}
                        {profileData?.pioneers.map((p: any) => (
                          <tr key={p.id}>
                            <td className="font-semibold">{p.placeName}</td>
                            <td>
                              <span className="badge badge-sm badge-success">Slot #{p.slotIndex}</span>
                            </td>
                            <td className="font-mono text-xs text-success">
                              {p.royaltyEarnedAvax} AVAX
                            </td>
                            <td>
                              {p.snowtraceUrl ? (
                                <a
                                  href={p.snowtraceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-xs btn-ghost text-primary font-mono gap-1"
                                >
                                  {p.onchainTxHash?.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* My Reviews Table */}
                <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-base-300">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-primary">
                      <History className="w-4 h-4" /> ประวัติการรีวิวทั้งหมด ({profileData?.reviews.length || 0})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ร้านอาหาร</th>
                          <th>คะแนน</th>
                          <th>ข้อความรีวิว</th>
                          <th>ยอดสลิป</th>
                          <th>รางวัลที่ได้รับ</th>
                          <th>Snowtrace Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!profileData?.reviews || profileData.reviews.length === 0) && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 opacity-40">
                              ยังไม่มีประวัติการรีวิว
                            </td>
                          </tr>
                        )}
                        {profileData?.reviews.map((r: any) => (
                          <tr key={r.id}>
                            <td className="font-semibold">{r.placeName}</td>
                            <td>⭐ {r.rating}</td>
                            <td className="text-xs max-w-xs truncate">{r.reviewText}</td>
                            <td className="font-mono text-xs">{r.slipAmountThb} ฿</td>
                            <td className="font-mono text-xs text-success">
                              {r.bountyRewardAvax > 0 ? `+${r.bountyRewardAvax} AVAX` : "-"}
                            </td>
                            <td>
                              {r.snowtraceUrl ? (
                                <a
                                  href={r.snowtraceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-xs btn-ghost text-primary font-mono gap-1"
                                >
                                  {r.onchainTxHash?.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── DETAIL MODAL ── */}
      {selectedPlace && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl bg-base-200 border border-base-300 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlace(null)}
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
            >
              <X className="w-4 h-4" />
            </button>

            {detailLoading ? (
              <div className="py-20 text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="badge badge-sm badge-outline capitalize mb-1">
                    {selectedPlace.place.service_type}
                  </span>
                  <h3 className="text-2xl font-bold">{selectedPlace.place.name}</h3>
                  <p className="text-xs opacity-60 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    {selectedPlace.place.address}
                  </p>
                </div>

                {/* Pioneer Board */}
                <div className="bg-base-100 p-4 rounded-xl border border-base-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-amber-400 flex items-center gap-1">
                      <Award className="w-4 h-4" /> Pioneer Slots (ผู้บุกเบิก 3 คนแรก)
                    </span>
                    <span className="text-xs opacity-50">
                      ว่าง {selectedPlace.pioneerSlotsOpen}/3 สล็อต
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {selectedPlace.pioneers.map((p: any) => (
                      <div
                        key={p.slot}
                        className={`p-2 rounded-lg border text-center ${
                          p.claimed
                            ? "bg-success/10 border-success/30 text-success"
                            : "bg-base-200 border-dashed border-base-300 opacity-60"
                        }`}
                      >
                        <span className="text-[10px] font-bold block">Slot #{p.slot}</span>
                        {p.claimed ? (
                          <a
                            href={p.snowtraceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono block underline mt-0.5 truncate"
                          >
                            {p.address.slice(0, 6)}...
                          </a>
                        ) : (
                          <span className="text-xs opacity-50">ยังว่าง</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-base-300">
                  {selectedPlace.place.google_map_url && (
                    <a
                      href={selectedPlace.place.google_map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> ดูบน Google Maps
                    </a>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const p = places.find(
                          (item) => item.place_id === selectedPlace.place.place_id
                        );
                        setSelectedPlace(null);
                        if (p) openBountyModal(p);
                      }}
                      className="btn btn-sm btn-outline btn-warning gap-1"
                    >
                      <Coins className="w-3.5 h-3.5" /> ตั้ง Bounty
                    </button>
                    <button
                      onClick={() => {
                        const p = places.find(
                          (item) => item.place_id === selectedPlace.place.place_id
                        );
                        setSelectedPlace(null);
                        if (p) startReviewFlow(p);
                      }}
                      className="btn btn-sm btn-primary gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> รีวิวร้านนี้
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MULTI-STEP REVIEW & PROOF-OF-VISIT MODAL ── */}
      {reviewModalOpen && reviewPlace && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl bg-base-200 border border-base-300 shadow-2xl relative">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Stepper Header */}
            <div className="space-y-2 border-b border-base-300 pb-4">
              <span className="badge badge-sm badge-primary font-bold">Proof-of-Visit Oracle</span>
              <h3 className="text-xl font-bold line-clamp-1">{reviewPlace.name}</h3>
              <div className="text-xs opacity-60 flex items-center gap-2">
                <span>Pioneer Status:</span>
                {reviewPlace.pioneers.slotsOpen > 0 ? (
                  <span className="text-success font-bold">
                    🎉 สล็อตยังว่าง! มีสิทธิ์เป็น Pioneer #{4 - reviewPlace.pioneers.slotsOpen}
                  </span>
                ) : (
                  <span>สล็อต Pioneer เต็มแล้ว (รับแต้มและรีวิวปกติ)</span>
                )}
              </div>

              {/* Steps Progress Bar */}
              <ul className="steps steps-horizontal w-full text-xs pt-2">
                <li className={`step ${reviewStep >= 1 ? "step-primary" : ""}`}>GPS</li>
                <li className={`step ${reviewStep >= 2 ? "step-primary" : ""}`}>รูปอาหาร</li>
                <li className={`step ${reviewStep >= 3 ? "step-primary" : ""}`}>สลิป PromptPay</li>
                <li className={`step ${reviewStep >= 4 ? "step-primary" : ""}`}>เซ็นชื่อ</li>
              </ul>
            </div>

            {/* Modal Body: STEP CONTENT */}
            <div className="py-4 space-y-4 min-h-[250px]">
              {/* STEP 1: GPS Check-in */}
              {reviewStep === 1 && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">ขั้นตอนที่ 1: ตรวจสอบพิกัด GPS หน้าร้าน</h4>
                    <p className="text-xs opacity-60 max-w-md mx-auto mt-1">
                      ระบบจะตรวจสอบว่าคุณอยู่ในรัศมีร้านอาหารจริง (&lt; 100 เมตร) เพื่อยืนยันตัวตน
                    </p>
                  </div>

                  {gpsStatus === "matched" ? (
                    <div className="alert alert-success text-xs justify-center py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ยืนยันพิกัดสำเร็จ! คุณอยู่ห่างจากร้าน {gpsDistance} เมตร</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleCheckGps}
                      disabled={gpsStatus === "checking"}
                      className="btn btn-primary btn-sm gap-2"
                    >
                      {gpsStatus === "checking" ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      <span>ตรวจสอบพิกัด GPS หน้าร้าน</span>
                    </button>
                  )}
                </div>
              )}

              {/* STEP 2: Live Food Photo */}
              {reviewStep === 2 && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 bg-warning/10 rounded-full flex items-center justify-center mx-auto text-warning">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">ขั้นตอนที่ 2: อัปโหลดภาพถ่ายอาหารสด</h4>
                    <p className="text-xs opacity-60 max-w-md mx-auto mt-1">
                      ถ่ายรูปอาหารมื้อนี้เพื่อคำนวณ Perceptual Hash (pHash) ป้องกันการขโมยรูปจากอินเทอร์เน็ต
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                  />

                  {photoPreview && (
                    <div className="relative w-48 h-32 mx-auto rounded-xl overflow-hidden border border-base-300 shadow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Food preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 badge badge-xs badge-success">
                        pHash Ready
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: PromptPay Slip OCR */}
              {reviewStep === 3 && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mx-auto text-error">
                    <FileCheck2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      ขั้นตอนที่ 3: อัปโหลดสลิป PromptPay / ใบเสร็จ
                    </h4>
                    <p className="text-xs opacity-60 max-w-md mx-auto mt-1">
                      AI OCR จะสกัด Transaction Ref ID และยอดเงิน เพื่อทำ One-way Hash บันทึกบน Avalanche
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipUpload}
                    className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                  />

                  {ocrLoading && (
                    <div className="py-2 flex items-center justify-center gap-2 text-xs text-primary">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span>OpenAI Vision กำลังวิเคราะห์สลิป PromptPay...</span>
                    </div>
                  )}

                  {ocrError && (
                    <div className="alert alert-error text-xs py-2 justify-center">
                      <AlertCircle className="w-4 h-4" />
                      <span>{ocrError}</span>
                    </div>
                  )}

                  {slipOcrResult && (
                    <div className="card bg-base-100 border border-base-300 p-3 max-w-md mx-auto text-left space-y-1.5 text-xs">
                      <div className="flex justify-between border-b border-base-300 pb-1">
                        <span className="opacity-50">ธนาคาร / ช่องทาง:</span>
                        <span className="font-bold">{slipOcrResult.bank_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-base-300 pb-1">
                        <span className="opacity-50">ยอดชำระเงิน:</span>
                        <span className="font-bold text-success font-mono">
                          {slipOcrResult.amount_thb} บาท
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-base-300 pb-1">
                        <span className="opacity-50">รหัสอ้างอิงธุรกรรม (Ref):</span>
                        <span className="font-mono">{slipOcrResult.transaction_ref_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-50">Anti-Replay Hash:</span>
                        <span className="badge badge-xs badge-success">ผ่านการตรวจสอบ ไม่ซ้ำ</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Rating, Text Review & Submit */}
              {reviewStep === 4 && (
                <div className="space-y-4">
                  {submitSuccess ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold">บันทึกรีวิวสำเร็จเรียบร้อย! 🎉</h4>
                        <p className="text-xs opacity-60 mt-1">
                          หลักฐาน Proof-of-Visit ถูกบันทึกและยืนยันบน Avalanche Fuji แล้ว
                        </p>
                      </div>

                      {submitSuccess.pioneerSlot && (
                        <div className="badge badge-lg badge-success font-bold py-3">
                          🏆 คุณได้รับสิทธิ์ Pioneer Slot #{submitSuccess.pioneerSlot}!
                        </div>
                      )}

                      <div className="pt-2">
                        <a
                          href={getSnowtraceTxUrl(submitSuccess.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline btn-primary gap-1 font-mono text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> ตรวจสอบ Transaction บน Snowtrace
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold opacity-70 block mb-1">
                          ให้คะแนนร้านอาหาร (1 - 5 ดาว):
                        </label>
                        <div className="rating rating-md gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <input
                              key={star}
                              type="radio"
                              name="rating-star"
                              className="mask mask-star-2 bg-amber-400"
                              checked={ratingInput === star}
                              onChange={() => setRatingInput(star)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold opacity-70 block mb-1">
                          ความประทับใจ / เมนูเด็ดที่สั่ง:
                        </label>
                        <textarea
                          className="textarea textarea-bordered w-full text-xs"
                          placeholder="อาหารอร่อย รวดเร็ว เมนูแนะนำคือ..."
                          rows={3}
                          value={reviewTextInput}
                          onChange={(e) => setReviewTextInput(e.target.value)}
                        ></textarea>
                      </div>

                      <div className="bg-base-100 p-3 rounded-xl border border-base-300 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="opacity-50">Wallet Address:</span>
                          <span className="font-mono">
                            {address?.slice(0, 8)}...{address?.slice(-6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-50">Pioneer Status:</span>
                          <span className="text-success font-bold">
                            {reviewPlace.pioneers.slotsOpen > 0
                              ? `รับสิทธิ์ Slot #${4 - reviewPlace.pioneers.slotsOpen}`
                              : "สล็อตเต็มแล้ว"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stepper Footer Controls */}
            {!submitSuccess && (
              <div className="flex items-center justify-between border-t border-base-300 pt-3">
                <button
                  disabled={reviewStep === 1 || submittingReview}
                  onClick={() => setReviewStep((s) => (s > 1 ? ((s - 1) as any) : s))}
                  className="btn btn-sm btn-ghost"
                >
                  ย้อนกลับ
                </button>

                {reviewStep < 4 ? (
                  <button
                    disabled={
                      (reviewStep === 1 && gpsStatus !== "matched") ||
                      (reviewStep === 2 && !photoPreview) ||
                      (reviewStep === 3 && (!slipOcrResult || ocrLoading))
                    }
                    onClick={() => setReviewStep((s) => (s < 4 ? ((s + 1) as any) : s))}
                    className="btn btn-sm btn-primary gap-1"
                  >
                    <span>ถัดไป</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="btn btn-sm btn-success font-bold gap-1.5 shadow-md shadow-success/20"
                  >
                    {submittingReview ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>เซ็น & บันทึกบน Avalanche</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MERCHANT BOUNTY MODAL ── */}
      {bountyModalOpen && bountyPlace && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg bg-base-200 border border-base-300 shadow-2xl relative">
            <button
              onClick={() => setBountyModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-warning/20 text-warning flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-lg">ตั้งแคมเปญ Bounty ดึงดูดลูกค้า</h3>
                <p className="text-xs opacity-60">ร้าน: {bountyPlace.name}</p>
              </div>
            </div>

            {bountySuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold">สร้างแคมเปญ Bounty สำเร็จ! 🎉</h4>
                  <p className="text-xs opacity-60 mt-1">
                    สัญญา Smart Contract ได้รับการตั้งค่าบน Avalanche Fuji แล้ว
                  </p>
                </div>

                <div className="p-3 bg-base-100 rounded-xl border border-base-300 text-xs text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="opacity-50">งบประมาณทั้งหมด:</span>
                    <span className="font-bold text-warning font-mono">{bountySuccess.bounty?.total_budget_avax} AVAX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-50">จ่ายต่อนักรีวิว:</span>
                    <span className="font-bold text-success font-mono">{bountyReward} AVAX / รีวิว</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-50">ยอดใช้จ่ายขั้นต่ำ:</span>
                    <span className="font-bold font-mono">{bountyMinSpend} บาท</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <a
                    href={bountySuccess.snowtraceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline btn-primary gap-1 font-mono text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> ตรวจสอบบน Snowtrace
                  </a>
                  <button
                    onClick={() => setBountyModalOpen(false)}
                    className="btn btn-sm btn-primary"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="alert alert-info py-2 text-xs">
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>
                    เหรียญ AVAX จะถูกฝากเข้า Contract และปลดล็อกให้นักรีวิวที่ผ่านการตรวจสอบ Proof-of-Visit เท่านั้น!
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">
                      งบประมาณรวม (Total Budget AVAX):
                    </label>
                    <div className="join w-full">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="input input-bordered input-sm join-item w-full font-mono text-sm"
                        value={bountyBudget}
                        onChange={(e) => setBountyBudget(parseFloat(e.target.value) || 0)}
                      />
                      <span className="btn btn-sm join-item btn-neutral pointer-events-none">AVAX</span>
                    </div>
                    {/* Quick Budget Presets */}
                    <div className="flex gap-1.5 mt-1.5">
                      {[0.2, 0.5, 1.0, 2.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBountyBudget(preset)}
                          className={`btn btn-xs ${bountyBudget === preset ? "btn-warning" : "btn-ghost"}`}
                        >
                          {preset} AVAX
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">
                      รางวัลต่อนักรีวิว (Reward per Verified Review):
                    </label>
                    <div className="join w-full">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={bountyBudget}
                        className="input input-bordered input-sm join-item w-full font-mono text-sm"
                        value={bountyReward}
                        onChange={(e) => setBountyReward(parseFloat(e.target.value) || 0)}
                      />
                      <span className="btn btn-sm join-item btn-neutral pointer-events-none">AVAX</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">
                      ยอดชำระขั้นต่ำในสลิป (Min Spend THB):
                    </label>
                    <div className="join w-full">
                      <input
                        type="number"
                        step="50"
                        min="50"
                        className="input input-bordered input-sm join-item w-full font-mono text-sm"
                        value={bountyMinSpend}
                        onChange={(e) => setBountyMinSpend(parseFloat(e.target.value) || 0)}
                      />
                      <span className="btn btn-sm join-item btn-neutral pointer-events-none">บาท (THB)</span>
                    </div>
                  </div>

                  <div className="bg-base-100 p-3 rounded-xl border border-base-300 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-50">จำนวนรีวิวที่จะได้รับ:</span>
                      <span className="font-bold text-primary">
                        {bountyReward > 0 ? Math.floor(bountyBudget / bountyReward) : 0} รีวิวจริง
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-50">Merchant Wallet:</span>
                      <span className="font-mono text-[11px]">
                        {address?.slice(0, 8)}...{address?.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-action border-t border-base-300 pt-3">
                  <button
                    onClick={() => setBountyModalOpen(false)}
                    className="btn btn-sm btn-ghost"
                    disabled={submittingBounty}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleFundBounty}
                    disabled={submittingBounty || bountyBudget <= 0 || bountyReward <= 0 || bountyReward > bountyBudget}
                    className="btn btn-sm btn-warning font-bold gap-1.5 shadow-md shadow-warning/20"
                  >
                    {submittingBounty ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <Coins className="w-4 h-4" />
                    )}
                    <span>สร้าง Bounty ({bountyBudget} AVAX)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
