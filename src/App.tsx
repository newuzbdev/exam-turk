// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   CheckCircle,
//   Clock,
//   Users,
//   Award,
//   Star,
//   ArrowRight,
//   BookOpen,
//   Headphones,
//   PenTool,
//   Mic,
//   Sparkles,
//   Zap,
//   Target,
// } from "lucide-react";
// import { NavLink } from "react-router";

// export default function App() {
//   return (
//     <div className="min-h-screen bg-white">
//       {/* Navigation */}
//       <nav className="bg-white/95 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center h-16">
//             <div className="flex items-center">
//               <NavLink
//                 to="/"
//                 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
//               >
//                 TürkTest
//               </NavLink>
//             </div>

//             <div className="hidden md:block">
//               <div className="ml-10 flex items-baseline space-x-8">
//                 <NavLink
//                   to="#"
//                   className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
//                 >
//                   Ana Sayfa
//                 </NavLink>
//                 <NavLink
//                   to="#about"
//                   className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
//                 >
//                   Hakkımızda
//                 </NavLink>
//                 <NavLink
//                   to="#features"
//                   className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
//                 >
//                   Özellikler
//                 </NavLink>
//                 <NavLink
//                   to="#pricing"
//                   className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
//                 >
//                   Fiyatlar
//                 </NavLink>
//                 <NavLink
//                   to="#contact"
//                   className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
//                 >
//                   İletişim
//                 </NavLink>
//               </div>
//             </div>

//             <div className="flex items-center space-x-4">
//               <Button
//                 variant="outline"
//                 className="hidden sm:inline-flex border-purple-200 text-purple-600 hover:bg-purple-50"
//               >
//                 Giriş Yap
//               </Button>
//               <NavLink to="/test-selection">
//                 <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
//                   Teste Başla
//                 </Button>
//               </NavLink>
//             </div>
//           </div>
//         </div>
//       </nav>

//       {/* Hero Section */}
//       <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
//         {/* Animated Background */}
//         <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,51,234,0.1),transparent_50%)]" />
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_50%)]" />
//         </div>

//         {/* Floating Elements */}
//         <div className="absolute inset-0 overflow-hidden pointer-events-none">
//           <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse" />
//           <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-20 animate-bounce" />
//           <div className="absolute bottom-40 left-20 w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-20 animate-pulse" />
//           <div className="absolute bottom-20 right-40 w-24 h-24 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full opacity-20 animate-bounce" />
//         </div>

//         <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="grid lg:grid-cols-2 gap-12 items-center">
//             <div className="text-gray-900">
//               <div className="flex items-center mb-6">
//                 <Sparkles className="h-8 w-8 text-purple-600 mr-3" />
//                 <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200">
//                   🚀 Yeni Nesil Türkçe Testi
//                 </Badge>
//               </div>

//               <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
//                 <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
//                   TÜRKÇE
//                 </span>
//                 <br />
//                 <span className="text-gray-900">DİL YETERLİLİK</span>
//                 <br />
//                 <span className="relative inline-block">
//                   <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl shadow-lg">
//                     TESTİ
//                   </span>
//                   <div className="absolute -top-2 -right-2">
//                     <Zap className="h-6 w-6 text-yellow-400 animate-pulse" />
//                   </div>
//                 </span>
//               </h1>

//               <p className="text-xl text-gray-600 mb-8 leading-relaxed">
//                 Türkçe dil seviyenizi ölçün ve geliştirin. Dinleme, okuma, yazma
//                 ve konuşma becerilerinizi
//                 <span className="font-semibold text-purple-600">
//                   {" "}
//                   yapay zeka destekli{" "}
//                 </span>
//                 sistemimizle test edin.
//               </p>

//               <div className="flex flex-wrap items-center gap-4 mb-8">
//                 <Badge
//                   variant="secondary"
//                   className="bg-purple-100 text-purple-800 border-purple-200 px-4 py-2"
//                 >
//                   <Users className="h-4 w-4 mr-2" />
//                   15,000+ kullanıcı tarafından güveniliyor
//                 </Badge>
//                 <div className="flex items-center text-sm text-gray-500">
//                   <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
//                   son kayıt:{" "}
//                   <span className="text-green-600 font-semibold ml-1">
//                     18 dakika
//                   </span>{" "}
//                   önce
//                 </div>
//               </div>

//               <div className="flex flex-wrap gap-4">
//                 <NavLink to="/test-selection">
//                   <Button
//                     size="lg"
//                     className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 px-8 py-4 text-lg"
//                   >
//                     <Target className="h-5 w-5 mr-2" />
//                     Ücretsiz Teste Başla
//                     <ArrowRight className="ml-2 h-5 w-5" />
//                   </Button>
//                 </NavLink>
//                 <Button
//                   variant="outline"
//                   size="lg"
//                   className="border-purple-200 text-purple-600 hover:bg-purple-50 px-8 py-4 text-lg"
//                 >
//                   <Award className="h-5 w-5 mr-2" />
//                   Demo İzle
//                 </Button>
//               </div>
//             </div>

//             <div className="relative">
//               {/* Glowing background */}
//               <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl blur-3xl opacity-20 animate-pulse" />

//               <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-purple-100">
//                 <div className="flex items-center justify-between mb-6">
//                   <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
//                     Türkçe Seviyenizi ÜCRETSİZ Öğrenin
//                   </h2>
//                   <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-full">
//                     <Sparkles className="h-6 w-6 text-purple-600" />
//                   </div>
//                 </div>

//                 <p className="text-gray-600 mb-6">
//                   Kapsamlı Türkçe dil testi ile seviyenizi belirleyin ve gelişim
//                   alanlarınızı keşfedin.
//                 </p>

//                 <div className="grid grid-cols-2 gap-4 mb-6">
//                   <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
//                     <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
//                       <Headphones className="h-4 w-4 text-white" />
//                     </div>
//                     <span className="text-sm font-medium">Dinleme</span>
//                   </div>
//                   <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-purple-50 rounded-xl">
//                     <div className="bg-gradient-to-r from-green-500 to-purple-500 p-2 rounded-lg">
//                       <BookOpen className="h-4 w-4 text-white" />
//                     </div>
//                     <span className="text-sm font-medium">Okuma</span>
//                   </div>
//                   <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
//                     <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
//                       <PenTool className="h-4 w-4 text-white" />
//                     </div>
//                     <span className="text-sm font-medium">Yazma</span>
//                   </div>
//                   <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-indigo-50 rounded-xl">
//                     <div className="bg-gradient-to-r from-pink-500 to-indigo-500 p-2 rounded-lg">
//                       <Mic className="h-4 w-4 text-white" />
//                     </div>
//                     <span className="text-sm font-medium">Konuşma</span>
//                   </div>
//                 </div>

//                 <NavLink to="/test-selection">
//                   <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
//                     <Zap className="mr-2 h-5 w-5" />
//                     Hemen Başla - Tamamen Ücretsiz
//                     <ArrowRight className="ml-2 h-5 w-5" />
//                   </Button>
//                 </NavLink>

//                 <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
//                   <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
//                   Kredi kartı gerektirmez
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* How it Works */}
//       <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-16">
//             <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 mb-4">
//               ✨ Süreç
//             </Badge>
//             <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
//               Nasıl Çalışır?
//             </h2>
//             <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//               Sadece 4 basit adımda Türkçe seviyenizi öğrenin
//             </p>
//           </div>

//           <div className="grid md:grid-cols-4 gap-8">
//             <div className="text-center group">
//               <div className="relative mb-6">
//                 <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow">
//                   <Users className="h-8 w-8 text-white" />
//                 </div>
//                 <div className="absolute -top-2 -right-2 bg-yellow-400 w-6 h-6 rounded-full flex items-center justify-center">
//                   <span className="text-xs font-bold text-gray-900">1</span>
//                 </div>
//               </div>
//               <h3 className="text-xl font-semibold mb-4 text-gray-900">
//                 Kayıt Ol
//               </h3>
//               <p className="text-gray-600">
//                 Hızlıca hesap oluştur ve Türkçe test kütüphanemize anında erişim
//                 sağla.
//               </p>
//             </div>

//             <div className="text-center group">
//               <div className="relative mb-6">
//                 <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow">
//                   <BookOpen className="h-8 w-8 text-white" />
//                 </div>
//                 <div className="absolute -top-2 -right-2 bg-yellow-400 w-6 h-6 rounded-full flex items-center justify-center">
//                   <span className="text-xs font-bold text-gray-900">2</span>
//                 </div>
//               </div>
//               <h3 className="text-xl font-semibold mb-4 text-gray-900">
//                 Test Seç
//               </h3>
//               <p className="text-gray-600">
//                 Dinleme, okuma, yazma veya konuşma testlerinden birini seç ve
//                 başla.
//               </p>
//             </div>

//             <div className="text-center group">
//               <div className="relative mb-6">
//                 <div className="bg-gradient-to-r from-green-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow">
//                   <Clock className="h-8 w-8 text-white" />
//                 </div>
//                 <div className="absolute -top-2 -right-2 bg-yellow-400 w-6 h-6 rounded-full flex items-center justify-center">
//                   <span className="text-xs font-bold text-gray-900">3</span>
//                 </div>
//               </div>
//               <h3 className="text-xl font-semibold mb-4 text-gray-900">
//                 Testi Tamamla
//               </h3>
//               <p className="text-gray-600">
//                 Gerçekçi test ortamında sorularını yanıtla ve zamanını etkili
//                 kullan.
//               </p>
//             </div>

//             <div className="text-center group">
//               <div className="relative mb-6">
//                 <div className="bg-gradient-to-r from-pink-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow">
//                   <Award className="h-8 w-8 text-white" />
//                 </div>
//                 <div className="absolute -top-2 -right-2 bg-yellow-400 w-6 h-6 rounded-full flex items-center justify-center">
//                   <span className="text-xs font-bold text-gray-900">4</span>
//                 </div>
//               </div>
//               <h3 className="text-xl font-semibold mb-4 text-gray-900">
//                 Sonuçları Al
//               </h3>
//               <p className="text-gray-600">
//                 Anında puanlama ve detaylı geri bildirim ile performansını
//                 değerlendir.
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section id="features" className="py-20">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-16">
//             <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 mb-4">
//               🎯 Özellikler
//             </Badge>
//             <h2 className="text-4xl font-bold text-gray-900 mb-4">
//               Neden TürkTest?
//             </h2>
//             <p className="text-xl text-gray-600 max-w-3xl mx-auto">
//               En kapsamlı ve kullanıcı dostu Türkçe dil yeterlilik test
//               platformunu deneyimleyin
//             </p>
//           </div>

//           <div className="grid md:grid-cols-3 gap-8">
//             <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-xl group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                   <CheckCircle className="h-6 w-6 text-white" />
//                 </div>
//                 <CardTitle className="text-xl">Anında Puanlama</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="text-base text-gray-600">
//                   Detaylı seviye puanları ve performans analitiği ile
//                   ilerlemenizi anında takip edin.
//                 </CardDescription>
//               </CardContent>
//             </Card>

//             <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-xl group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                   <Headphones className="h-6 w-6 text-white" />
//                 </div>
//                 <CardTitle className="text-xl">4 Temel Beceri</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="text-base text-gray-600">
//                   Dinleme, okuma, yazma ve konuşma becerilerinizi ayrı ayrı test
//                   edin ve geliştirin.
//                 </CardDescription>
//               </CardContent>
//             </Card>

//             <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-xl group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-pink-500 to-purple-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                   <Award className="h-6 w-6 text-white" />
//                 </div>
//                 <CardTitle className="text-xl">Uzman Geri Bildirimi</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="text-base text-gray-600">
//                   Türkçe dil uzmanlarından kişiselleştirilmiş öneriler ve
//                   gelişim stratejileri alın.
//                 </CardDescription>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </section>

//       {/* Test Types */}
//       <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-16">
//             <Badge className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-200 mb-4">
//               📚 Test Türleri
//             </Badge>
//             <h2 className="text-4xl font-bold text-gray-900 mb-4">
//               Test Türleri
//             </h2>
//             <p className="text-xl text-gray-600">
//               Türkçe dil becerilerinizi kapsamlı şekilde değerlendirin
//             </p>
//           </div>

//           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
//             <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-blue-100 hover:border-blue-300 group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
//                   <Headphones className="h-8 w-8 text-white" />
//                 </div>
//                 <CardTitle>Dinleme Testi</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="mb-4">
//                   Türkçe dinleme becerinizi çeşitli ses kayıtları ile test edin.
//                 </CardDescription>
//                 <Badge
//                   variant="secondary"
//                   className="bg-blue-100 text-blue-800"
//                 >
//                   30 dakika
//                 </Badge>
//               </CardContent>
//             </Card>

//             <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-green-100 hover:border-green-300 group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-green-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
//                   <BookOpen className="h-8 w-8 text-white" />
//                 </div>
//                 <CardTitle>Okuma Testi</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="mb-4">
//                   Türkçe metinleri anlama ve yorumlama becerinizi ölçün.
//                 </CardDescription>
//                 <Badge
//                   variant="secondary"
//                   className="bg-green-100 text-green-800"
//                 >
//                   45 dakika
//                 </Badge>
//               </CardContent>
//             </Card>

//             <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-300 group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
//                   <PenTool className="h-8 w-8 text-white" />
//                 </div>
//                 <CardTitle>Yazma Testi</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="mb-4">
//                   Türkçe yazma becerinizi çeşitli konularda değerlendirin.
//                 </CardDescription>
//                 <Badge
//                   variant="secondary"
//                   className="bg-purple-100 text-purple-800"
//                 >
//                   60 dakika
//                 </Badge>
//               </CardContent>
//             </Card>

//             <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-pink-100 hover:border-pink-300 group">
//               <CardHeader>
//                 <div className="bg-gradient-to-r from-pink-500 to-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
//                   <Mic className="h-8 w-8 text-white" />
//                 </div>
//                 <CardTitle>Konuşma Testi</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <CardDescription className="mb-4">
//                   Türkçe konuşma ve telaffuz becerinizi sesli kayıt ile test
//                   edin.
//                 </CardDescription>
//                 <Badge
//                   variant="secondary"
//                   className="bg-pink-100 text-pink-800"
//                 >
//                   20 dakika
//                 </Badge>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </section>

//       {/* Testimonials */}
//       <section className="py-20">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-16">
//             <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border-yellow-200 mb-4">
//               ⭐ Yorumlar
//             </Badge>
//             <h2 className="text-4xl font-bold text-gray-900 mb-4">
//               Kullanıcı Yorumları
//             </h2>
//           </div>

//           <div className="grid md:grid-cols-3 gap-8">
//             <Card className="hover:shadow-xl transition-all duration-300 border-2 border-yellow-100 hover:border-yellow-300">
//               <CardContent className="pt-6">
//                 <div className="flex mb-4">
//                   {[...Array(5)].map((_, i) => (
//                     <Star
//                       key={i}
//                       className="h-5 w-5 text-yellow-400 fill-current"
//                     />
//                   ))}
//                 </div>
//                 <p className="text-gray-600 mb-4">
//                   "TürkTest sayesinde Türkçe seviyemi doğru şekilde belirledim.
//                   Test sonuçları çok detaylı ve faydalı!"
//                 </p>
//                 <div className="font-semibold">Ahmet Yılmaz</div>
//                 <div className="text-sm text-purple-600">Türkçe Seviye: B2</div>
//               </CardContent>
//             </Card>

//             <Card className="hover:shadow-xl transition-all duration-300 border-2 border-yellow-100 hover:border-yellow-300">
//               <CardContent className="pt-6">
//                 <div className="flex mb-4">
//                   {[...Array(5)].map((_, i) => (
//                     <Star
//                       key={i}
//                       className="h-5 w-5 text-yellow-400 fill-current"
//                     />
//                   ))}
//                 </div>
//                 <p className="text-gray-600 mb-4">
//                   "Konuşma testi özellikle çok başarılı. Telaffuzumu geliştirmek
//                   için harika öneriler aldım."
//                 </p>
//                 <div className="font-semibold">Fatma Demir</div>
//                 <div className="text-sm text-purple-600">Türkçe Seviye: C1</div>
//               </CardContent>
//             </Card>

//             <Card className="hover:shadow-xl transition-all duration-300 border-2 border-yellow-100 hover:border-yellow-300">
//               <CardContent className="pt-6">
//                 <div className="flex mb-4">
//                   {[...Array(5)].map((_, i) => (
//                     <Star
//                       key={i}
//                       className="h-5 w-5 text-yellow-400 fill-current"
//                     />
//                   ))}
//                 </div>
//                 <p className="text-gray-600 mb-4">
//                   "Kullanıcı dostu arayüz ve kapsamlı test içeriği. Türkçe
//                   öğrenmek isteyenlere kesinlikle tavsiye ederim!"
//                 </p>
//                 <div className="font-semibold">Mehmet Özkan</div>
//                 <div className="text-sm text-purple-600">Türkçe Seviye: A2</div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </section>

//       {/* Pricing */}
//       <section
//         id="pricing"
//         className="py-20 bg-gradient-to-br from-gray-50 to-purple-50"
//       >
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-16">
//             <Badge className="bg-gradient-to-r from-green-100 to-purple-100 text-green-700 border-green-200 mb-4">
//               💎 Fiyatlar
//             </Badge>
//             <h2 className="text-4xl font-bold text-gray-900 mb-4">
//               Fiyat Planları
//             </h2>
//             <p className="text-xl text-gray-600">
//               Ücretsiz deneme ile başlayın, hazır olduğunuzda yükseltin
//             </p>
//           </div>

//           <div className="grid md:grid-cols-3 gap-8">
//             <Card className="hover:shadow-xl transition-all duration-300">
//               <CardHeader>
//                 <CardTitle>Ücretsiz Deneme</CardTitle>
//                 <div className="text-3xl font-bold text-gray-900">₺0</div>
//                 <CardDescription>Başlamak için mükemmel</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <ul className="space-y-3 mb-6">
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />1 Tam
//                     Test
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Temel Puanlama
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Sınırlı Geri Bildirim
//                   </li>
//                 </ul>
//                 <Button
//                   variant="outline"
//                   className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
//                 >
//                   Ücretsiz Başla
//                 </Button>
//               </CardContent>
//             </Card>

//             <Card className="border-2 border-purple-300 relative hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
//               <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
//                 ⭐ En Popüler
//               </Badge>
//               <CardHeader>
//                 <CardTitle>Premium</CardTitle>
//                 <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
//                   ₺99
//                   <span className="text-lg font-normal text-gray-600">/ay</span>
//                 </div>
//                 <CardDescription>Ciddi hazırlık için en iyi</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <ul className="space-y-3 mb-6">
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Sınırsız Test
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Detaylı Analitik
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Uzman Geri Bildirimi
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     İlerleme Takibi
//                   </li>
//                 </ul>
//                 <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg">
//                   Premium Al
//                 </Button>
//               </CardContent>
//             </Card>

//             <Card className="hover:shadow-xl transition-all duration-300">
//               <CardHeader>
//                 <CardTitle>Kurumsal</CardTitle>
//                 <div className="text-3xl font-bold text-gray-900">
//                   ₺299
//                   <span className="text-lg font-normal text-gray-600">/ay</span>
//                 </div>
//                 <CardDescription>Kurumlar ve ekipler için</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <ul className="space-y-3 mb-6">
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Premium'daki Her Şey
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Ekip Yönetimi
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Özel Marka
//                   </li>
//                   <li className="flex items-center">
//                     <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
//                     Öncelikli Destek
//                   </li>
//                 </ul>
//                 <Button
//                   variant="outline"
//                   className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
//                 >
//                   Satış Ekibiyle İletişim
//                 </Button>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer
//         id="contact"
//         className="bg-gradient-to-br from-gray-900 to-purple-900 text-white py-16"
//       >
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="grid md:grid-cols-4 gap-8">
//             <div>
//               <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
//                 TürkTest
//               </div>
//               <p className="text-gray-400 mb-4">
//                 Türkçe dil yeterlilik seviyenizi belirlemek ve geliştirmek için
//                 en kapsamlı platform.
//               </p>
//             </div>

//             <div>
//               <h3 className="font-semibold mb-4">Hızlı Bağlantılar</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li>
//                   <NavLink
//                     to="#"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Ana Sayfa
//                   </NavLink>
//                 </li>
//                 <li>
//                   <NavLink
//                     to="#about"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Hakkımızda
//                   </NavLink>
//                 </li>
//                 <li>
//                   <NavLink
//                     to="#features"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Özellikler
//                   </NavLink>
//                 </li>
//                 <li>
//                   <NavLink
//                     to="#pricing"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Fiyatlar
//                   </NavLink>
//                 </li>
//               </ul>
//             </div>

//             <div>
//               <h3 className="font-semibold mb-4">Test Türleri</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li>
//                   <NavLink
//                     to="#"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Dinleme Testi
//                   </NavLink>
//                 </li>
//                 <li>
//                   <NavLink
//                     to="#"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Okuma Testi
//                   </NavLink>
//                 </li>
//                 <li>
//                   <NavLink
//                     to="#"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Yazma Testi
//                   </NavLink>
//                 </li>
//                 <li>
//                   <NavLink
//                     to="#"
//                     className="hover:text-purple-400 transition-colors"
//                   >
//                     Konuşma Testi
//                   </NavLink>
//                 </li>
//               </ul>
//             </div>

//             <div>
//               <h3 className="font-semibold mb-4">İletişim Bilgileri</h3>
//               <div className="text-gray-400 space-y-2">
//                 <p>destek@turktest.com</p>
//                 <p>+90 (212) 123-4567</p>
//                 <p>
//                   Türkiye Caddesi No:123
//                   <br />
//                   İstanbul, Türkiye 34000
//                 </p>
//               </div>
//             </div>
//           </div>

//           <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
//             <p>
//               &copy; {new Date().getFullYear()} TürkTest. Tüm hakları saklıdır.
//             </p>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Users,
  Award,
  Star,
  ArrowRight,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Shield,
  TrendingUp,
  Globe,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <NavLink to="/" className="text-3xl font-bold text-red-600">
                TürkTest
              </NavLink>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-10">
                <NavLink
                  to="#"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Ana Sayfa
                </NavLink>
                <NavLink
                  to="#about"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Hakkımızda
                </NavLink>
                <NavLink
                  to="#features"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Özellikler
                </NavLink>
                <NavLink
                  to="#pricing"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Fiyatlar
                </NavLink>
                <NavLink
                  to="#contact"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  İletişim
                </NavLink>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-gray-600 hover:text-red-600"
              >
                Giriş Yap
              </Button>
              <NavLink to="/test-selection">
                <Button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200">
                  Teste Başla
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-8 bg-red-100 text-red-700 border-red-200 px-4 py-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Türkiye'nin En Güvenilir Dil Testi Platformu
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-8">
              Türkçe Dil
              <br />
              <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Yeterlilik Testi
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
              Profesyonel Türkçe dil seviyenizi ölçün. Dinleme, okuma, yazma ve
              konuşma becerilerinizi kapsamlı şekilde değerlendirin ve
              sertifikanızı alın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <NavLink to="/test-selection">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Ücretsiz Teste Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </NavLink>
              <Button
                variant="outline"
                size="lg"
                className="border-red-200 text-red-600 hover:bg-red-50 px-8 py-4 text-lg"
              >
                Demo İzle
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-red-500" />
                <span>15,000+ aktif kullanıcı</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-red-500" />
                <span>Güvenli ve sertifikalı</span>
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2 text-red-500" />
                <span>Uluslararası standartlar</span>
              </div>
            </div>
          </div>

          {/* Hero Cards */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <Headphones className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Dinleme</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Türkçe dinleme becerinizi test edin
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Okuma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Metin anlama ve yorumlama
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <PenTool className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Yazma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Yazılı ifade becerinizi ölçün
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Konuşma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Sözlü ifade ve telaffuz</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                15,000+
              </div>
              <div className="text-gray-600">Aktif Kullanıcı</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                50,000+
              </div>
              <div className="text-gray-600">Tamamlanan Test</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                98%
              </div>
              <div className="text-gray-600">Memnuniyet Oranı</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                24/7
              </div>
              <div className="text-gray-600">Destek Hizmeti</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <Award className="h-4 w-4 mr-2" />
              Özellikler
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Neden TürkTest?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Profesyonel Türkçe dil yeterlilik testinizi güvenilir ve kapsamlı
              platformumuzda gerçekleştirin
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Anında Sonuç
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Test tamamlandıktan hemen sonra detaylı performans raporunuzu
                görüntüleyin. Güçlü ve geliştirilmesi gereken alanlarınızı
                keşfedin.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Sertifikalı Sonuçlar
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Uluslararası standartlara uygun test sonuçlarınızı resmi
                sertifika ile belgelendirin. CV'nizde ve başvurularınızda
                kullanın.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                İlerleme Takibi
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Zaman içindeki gelişiminizi takip edin. Detaylı analitikler ile
                hangi alanlarda ilerleme kaydettiğinizi görün.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <Sparkles className="h-4 w-4 mr-2" />
              Süreç
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Nasıl Çalışır?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Sadece üç basit adımda Türkçe dil seviyenizi öğrenin
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-yellow-800" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Test Seçin
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Dinleme, okuma, yazma veya konuşma testlerinden birini seçin.
                Tam değerlendirme için dört testin tamamını alabilirsiniz.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-yellow-800" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Testi Tamamlayın
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Gerçek sınav ortamını simüle eden platformumuzda testinizi
                tamamlayın. Süre takibi ve ilerleme çubuğu ile kendinizi takip
                edin.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-yellow-800" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Sonuçları Alın
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Anında puanlama ile seviyenizi öğrenin. Detaylı rapor ve gelişim
                önerileri ile Türkçenizi geliştirin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <Star className="h-4 w-4 mr-2" />
              Yorumlar
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Kullanıcı Deneyimleri
            </h2>
            <p className="text-xl text-gray-600">
              Binlerce kullanıcının güvendiği platform
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border-red-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8">
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "TürkTest sayesinde Türkçe seviyemi doğru şekilde belirledim.
                  Test sonuçları çok detaylı ve profesyonel. Kesinlikle tavsiye
                  ederim."
                </blockquote>
                <div className="border-t border-red-100 pt-4">
                  <div className="font-semibold text-gray-900">
                    Ahmet Yılmaz
                  </div>
                  <div className="text-sm text-red-600">
                    Öğretmen • Türkçe Seviye: B2
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8">
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Konuşma testi özellikle çok başarılı. Telaffuzumu geliştirmek
                  için aldığım geri bildirimler çok faydalı oldu."
                </blockquote>
                <div className="border-t border-red-100 pt-4">
                  <div className="font-semibold text-gray-900">Fatma Demir</div>
                  <div className="text-sm text-red-600">
                    Mühendis • Türkçe Seviye: C1
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8">
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Kullanıcı dostu arayüz ve kapsamlı test içeriği. Türkçe
                  öğrenmek isteyenlere kesinlikle tavsiye ederim."
                </blockquote>
                <div className="border-t border-red-100 pt-4">
                  <div className="font-semibold text-gray-900">
                    Mehmet Özkan
                  </div>
                  <div className="text-sm text-red-600">
                    Öğrenci • Türkçe Seviye: A2
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fiyatlar
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Fiyat Planları
            </h2>
            <p className="text-xl text-gray-600">
              İhtiyacınıza uygun planı seçin
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Temel</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">₺0</div>
                <CardDescription className="text-lg mt-2">
                  Başlamak için ideal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>1 Tam Test</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Temel Puanlama</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Sınırlı Geri Bildirim</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  Ücretsiz Başla
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-500 relative hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white">
                En Popüler
              </Badge>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Profesyonel</CardTitle>
                <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mt-4">
                  ₺99
                  <span className="text-lg font-normal text-gray-600">/ay</span>
                </div>
                <CardDescription className="text-lg mt-2">
                  Kapsamlı değerlendirme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Sınırsız Test</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Detaylı Analitik</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Uzman Geri Bildirimi</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Sertifika</span>
                  </li>
                </ul>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg">
                  Profesyonel Al
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-100 hover:border-red-200 hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Kurumsal</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">
                  ₺299
                  <span className="text-lg font-normal text-gray-600">/ay</span>
                </div>
                <CardDescription className="text-lg mt-2">
                  Kurumlar için
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Profesyonel'deki Her Şey</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Ekip Yönetimi</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Özel Raporlama</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span>Öncelikli Destek</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  İletişime Geç
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Türkçe Seviyenizi Öğrenmeye Hazır mısınız?
          </h2>
          <p className="text-xl text-red-100 mb-12">
            Binlerce kullanıcının güvendiği platformda Türkçe dil yeterlilik
            testinizi hemen başlatın.
          </p>
          <NavLink to="/test-selection">
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Ücretsiz Teste Başla
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </NavLink>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-red-600 mb-4">
                TürkTest
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Türkçe dil yeterlilik seviyenizi belirlemek ve geliştirmek için
                profesyonel platform.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Hızlı Bağlantılar
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Ana Sayfa
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#about"
                    className="hover:text-red-600 transition-colors"
                  >
                    Hakkımızda
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#features"
                    className="hover:text-red-600 transition-colors"
                  >
                    Özellikler
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#pricing"
                    className="hover:text-red-600 transition-colors"
                  >
                    Fiyatlar
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Test Türleri</h3>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Dinleme Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Okuma Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Yazma Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Konuşma Testi
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">İletişim</h3>
              <div className="text-gray-600 space-y-3">
                <p>destek@turktest.com</p>
                <p>+90 (212) 123-4567</p>
                <p>
                  Türkiye Caddesi No:123
                  <br />
                  İstanbul, Türkiye 34000
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} TürkTest. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
