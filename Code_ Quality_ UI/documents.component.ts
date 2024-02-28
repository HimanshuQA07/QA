import {Component} from '@angular/core';
import {ClipboardService} from 'ngx-clipboard';
import {ToastrService} from 'ngx-toastr';
import {Subscription} from 'rxjs';
import {DocumentService} from 'src/app/services/document.service';
import {AuthService} from "../../../services/auth.service";
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent {
  documents: any;
  links: any
  Breadcrumb: any = 'My Documents';
  breadcrumbIcon: any = 'doc'
  myDefaultTeam: any;
  showEmpty: boolean = false;
  menuIndex: number = -1;
  sortingMenu: boolean = false;
  sortingOption: any;
  cardMenu: boolean = false;
  moveTeamDialogue: boolean = false;
  startNewDialogue: boolean = false;
  selectedDocId: any
  selectedMoveTeamId: any
  permissionsArr: any[] = [];
  selectedDocSlug: any
  extensionInstalled: boolean = false;
  docListView: boolean = false;
  shareDialogue: boolean = false;
  subscription: Subscription;
  selectedDocUsers: any
  browserName = '';
  loggedInUserRole: any
  currentPage: any = 1;

  constructor(
    public documentService: DocumentService,
    public toasterService: ToastrService,
    private _clipboardService: ClipboardService,
    public authService: AuthService,
    private route: Router,
    private router: ActivatedRoute,
  ) {
    this.subscription = this.documentService.click$.subscribe((res: any) => {
      if (res == 'move') {
        this.moveTeamDialogue = false;
      } else if (res == 'share') {
        this.shareDialogue = false;
        this.getAllDocumentsData()
      } else if (res == 'profile-update' || res == 'update-team') {
        this.getAllDocumentsData()
      } else if (res == 'grid') {
        this.docListView = false;
      } else if (res == 'list') {
        this.docListView = true;
      } else {
        this.startNewDialogue = false;
      }
    });


    this.subscription = this.documentService.changeDocumentStep$.subscribe((res: any) => {
      // next: (res: any) => {
      this.currentPage = 1;
      if (res == 'Favorites') {
        this.breadcrumbIcon = 'doc'
        this.Breadcrumb = res;
        this.getAllDocuments('active', true);
      } else if (res == 'Shared with me') {
        this.breadcrumbIcon = 'doc'
        this.Breadcrumb = res;
        this.getMySharedDocs();
      } else if (res == 'Private') {
        this.breadcrumbIcon = 'private'
        this.Breadcrumb = res;
        this.getMyPrivateDocs();
      } else if (res == 'Trash') {
        this.breadcrumbIcon = 'trash'
        this.Breadcrumb = res;
        this.getAllDocuments('trashed');
      } else if (res == 'Created by me') {
        this.breadcrumbIcon = 'doc'
        this.Breadcrumb = 'My Documents';
        this.getAllDocuments('active');
      } else if (res == 'Shared with Team') {
        this.breadcrumbIcon = 'share-team'
        this.Breadcrumb = 'Shared with Team';
        this.getSharedDocsWithTeam();
      }

      // error: (err) => {
      //   console.log(err.error.message);
      // },
    });
  }

  ngOnInit() {
    // this.getAllDocuments('active');
    let teamId = localStorage.getItem('teamId')
    this.getTeam(teamId)

    this.docListView = localStorage.getItem('card_view') != 'grid';
    this.getAllDocumentsData()
    this.checkExtensionInstalled();
    this.browserName = this.getBrowserName();
  }

  getQuery(url: string) {
    if (url) {
      const params = new URLSearchParams(new URL(url).search);
      const pageValue = params.get("page");
      this.currentPage = pageValue
      this.getAllDocumentsData()
    }
    return 1
  }

  getDefaultTeams() {
    this.documentService.getDefaultTeams().subscribe({
      next: (res) => {
        this.myDefaultTeam = res.data;
        this.getSharedDocsWithTeam();
        localStorage.setItem('teamId', this.myDefaultTeam.id)
      },
      error: (err) => {
        // this.toasterService.error(err.error.message);
      },
    });
  }

  getTeam(id: any) {
    const loggedUserId = localStorage.getItem('id');
    this.documentService.getTeamDetailsById(id).subscribe({
      next: (res: any) => {
        this.loggedInUserRole = res.data.members.find((res: any) => res.id == loggedUserId);

        localStorage.setItem('userRole', this.loggedInUserRole.role.name)
      },
      error: (err) => {
      },
    });
  }

  getAllDocuments(type: any, favourite?: boolean) {
    if (!favourite) {

      this.documentService.getAllDocuments(type, this.currentPage).subscribe({
        next: (res) => {
          console.log('res getAllDocument - ', res);
          
          this.showEmpty = true;
          this.documents = res.data.data;
          this.links = res.data.links
          let userId = localStorage.getItem("id")
          this.documents = this.documents.filter((item: any) => item.doument_users.some((doc: any) => doc.user_id == userId && doc.is_owner == "Yes"));
          this.permissionsArr = res.DocPermission.data.filter((item: any) => {
            return this.documents.some((firstItem: any) => firstItem.id === item.documentId);
          });
          
          // if(favourite === true){
          //   // this.documents = this.documents.filter((obj: any) => {
          //   //   const hasEmptyArray = obj.favourite_document.length === 0
          //   //   return !hasEmptyArray;
          //   // });
          //   this.getFavoriteDocuments();
          //   // let userId=localStorage.getItem("id")
          //   // this.documents=res.data.data.filter((item:any) => item.favourite_document.some((doc:any) => doc.user_id == 4));
          //   // this.permissionsArr = res.DocPermission.data.filter((item:any) => {
          //   //   return this.documents.some((firstItem:any) => firstItem.id === item.documentId);
          //   // });
          // }
          if (this.sortingOption) {
            this.sortItems(this.sortingOption)
          }
        },
        error: (err) => {
        },
      });
    } else {
      this.getFavoriteDocuments();
    }

  }

  getFavoriteDocuments() {
    this.documentService.getFavDocuments(this.currentPage).subscribe({
      next: (res) => {
        this.documents = res.data.data
        this.links = res.data.links
        this.permissionsArr = res.DocPermission.data
        // this.toasterService.success(res.message);
      },
      error: (err) => {
        this.toasterService.error(err.message);
      },
    });
  }

  getBrowserName() {
    const agent = window.navigator.userAgent.toLowerCase();
    switch (true) {
      case agent.indexOf('edg') > -1:
        return 'edg';
      case agent.indexOf('opr') > -1 && !!(<any>window).opr:
        return 'opera';
      case agent.indexOf('chrome') > -1 && !!(<any>window).chrome:
        return 'chrome';
      case agent.indexOf('trident') > -1:
        return 'ie';
      case agent.indexOf('firefox') > -1:
        return 'firefox';
      case agent.indexOf('safari') > -1:
        return 'safari';
      default:
        return 'other';
    }
  }

  getOwnerName(data: any) {
    if (data) {
      let ownerData = data.find((arr: any) => arr.is_owner === 'Yes');
      return (ownerData.users.first_name + " " + ownerData.users.last_name);
    } else {
      return 'NA';
    }
  }

  getFavoriteDoc(data: any) {
    if (this.Breadcrumb !== 'Favorites') {
      let userId = localStorage.getItem("id")
      if (data) {
        let docDetails = data.find((arr: any) => arr.user_id == userId)

        return docDetails == undefined ? false : true
      } else {
        return false;
      }

    } else {
      return true;
    }

  }

  duplicateDocument(id: any) {
    this.documentService.duplicateDocument(id).subscribe({
      next: (res) => {
        this.showEmpty = true;
        this.getAllDocuments('active');
        this.toasterService.success(res.message);
      },
      error: (err) => {
        // this.toasterService.error(err.error.message);
        this.toasterService.warning(err.error.message);
        const returnUrl =
        this.router.snapshot.queryParams['returnUrl'] || '/dashboard/upgrade-subscription';
        this.route.navigateByUrl(returnUrl);
        this.documentService.emitClickEvent();
      },
    });
  }

  moveToTeam(documentId: any) {
    const data = {
      document_id: documentId,
      team_id: 123,
    };
    this.documentService.moveToTeam(data).subscribe({
      next: (res) => {
        this.toasterService.success('Successfully moved to team');
      },
      error: (err) => {
        this.toasterService.error(err.message);
      },
    });
  }

  addTofavorite(data: any) {
    this.documentService.addTofavorite(data.id).subscribe({
      next: (res) => {

        if (this.Breadcrumb == 'Favorites') {
          this.breadcrumbIcon = 'doc'
          this.getAllDocuments('active', true);
        } else if (this.Breadcrumb == 'Shared with me') {
          this.breadcrumbIcon = 'doc'
          this.getMySharedDocs();
        } else if (this.Breadcrumb == 'Private') {
          this.breadcrumbIcon = 'private'
          this.getMyPrivateDocs();
        } else if (this.Breadcrumb == 'Trash') {
          this.breadcrumbIcon = 'trash'
          this.getAllDocuments('trashed ');
        } else if (this.Breadcrumb == 'Created by me') {
          this.breadcrumbIcon = 'doc'
          this.getAllDocuments('active');
        } else if (this.Breadcrumb == 'My Documents') {
          this.breadcrumbIcon = 'doc'
          this.getAllDocuments('active');
        } else if (this.Breadcrumb == 'Shared with Team') {
          this.breadcrumbIcon = 'share-team'
          // this.Breadcrumb = 'Shared with Team';
          this.getSharedDocsWithTeam();
        }
        this.toasterService.success('Successfully added to favorite');
      },
      error: (err) => {
        this.toasterService.success(err.message);
      },
    });

  }

  removeFavorite(data: any) {
    this.documentService.removeTofavorite(data.id).subscribe({
      next: (res) => {
        if (this.Breadcrumb == 'Favorites') {
          this.breadcrumbIcon = 'doc'
          this.getAllDocuments('active', true);
        } else if (this.Breadcrumb == 'Shared with me') {
          this.breadcrumbIcon = 'doc'
          this.getMySharedDocs();
        } else if (this.Breadcrumb == 'Private') {
          this.breadcrumbIcon = 'private'
          this.getMyPrivateDocs();
        } else if (this.Breadcrumb == 'Trash') {
          this.breadcrumbIcon = 'trash'
          this.getAllDocuments('trashed ');
        } else if (this.Breadcrumb == 'Created by me') {
          this.breadcrumbIcon = 'doc'
          this.getAllDocuments('active');
        } else if (this.Breadcrumb == 'My Documents') {
          this.breadcrumbIcon = 'doc'
          this.getAllDocuments('active');
        } else if (this.Breadcrumb == 'Shared with Team') {
          this.breadcrumbIcon = 'share-team'
          // this.Breadcrumb = 'Shared with Team';
          this.getSharedDocsWithTeam();
        }
        this.toasterService.success('Successfully removed from favorite');
      },
      error: (err) => {
        this.toasterService.success(err.message);
      },
    });
  }

  deleteDocuments(index: number, id: number, event: any) {
    event.preventDefault();
    this.documentService.deleteDocument(id).subscribe({
      next: (res) => {
        this.showEmpty = true;
        this.documents.splice(index, 1);
      },
      error: (err) => {
      },
    });
  }

  deleteDocumentsPermanently(index: number, id: number, event: any) {
    event.preventDefault();
    this.documentService.deleteDocumentPermanently(id).subscribe({
      next: (res) => {
        this.showEmpty = true;
        this.documents.splice(index, 1);
      },
      error: (err) => {
      },
    });
  }

  copyToClipboard(id: any) {
    // this.clipboard.copy
    this._clipboardService.copy(
      `https://web.kopyst.com/workflow/public-viewer/${id}`
    );
    this.toasterService.success('You have successfully copied');
  }

  getMyFavorite() {
    // this.documentService.getMyFavoriteDocs().subscribe({
    //   next: (res) => {
    //     // this.documents = res.data.data;
    //   },
    //   error: (err) => {},
    // });
    this.showEmpty = true;
    this.documents = this.documents.filter((obj: any) => {
      const hasEmptyArray = obj.favourite_document.length === 0
      return !hasEmptyArray;
    });
  }

  getMySharedDocs() {
    this.documentService.getMySharedDocs(this.currentPage).subscribe({
      next: (res) => {
        this.showEmpty = true;
        this.documents = res.data && res.data.data ? res.data.data : [];
        this.links = res.data.links
        this.permissionsArr = res.DocPermission.data;
      },
      error: (err) => {
      },
    });
  }

  getMyPrivateDocs() {
    this.documentService.getMyPrivateDocs(this.currentPage).subscribe({
      next: (res) => {
        this.showEmpty = true;
        this.documents = res.data.data;
        this.links = res.data.links
      },
      error: (err) => {
      },
    });
  }

  getSharedDocsWithTeam() {
    const teamId = localStorage.getItem('teamId');

    this.documentService.getSharedWithDocument(teamId, this.currentPage).subscribe({
      next: (res: any) => {
        this.showEmpty = true;
        this.documents = res.data.data;
        this.links = res.data.links
        this.permissionsArr = res.DocPermission.data;
      },
      error: (err) => {
        this.toasterService.error(err.error.message);
      },
    });


  }

  sortItems(type: string) {
    this.sortingOption = type;
    this.documents.sort((a: any, b: any) => {
      if (type == 'alphabetical') {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) {
          return -1;
        } else if (nameA > nameB) {
          return 1;
        }
        return 0;
      } else if (type == 'create') {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);

        return dateB.getTime() - dateA.getTime();
      } else if (type == 'update') {
        const dateA = new Date(a.updated_at);
        const dateB = new Date(b.updated_at);

        return dateB.getTime() - dateA.getTime();
      } else if (type == 'view') {
        const viewA = a.views;
        const viewB = b.views;

        return viewB - viewA;
      } else {
        return;
      }
    })


  }

  closeMenu(index: number) {
    if (this.cardMenu && index == this.menuIndex) {
      this.cardMenu = false;
    }
  }

  closeSortMenu() {
    if (this.sortingMenu) {
      this.sortingMenu = false;
    }
  }


  getAllDocumentsData() {
    this.Breadcrumb = localStorage.getItem('step')
      ? localStorage.getItem('step')
      : 'My Documents';
    if (this.Breadcrumb == 'Favorites') {
      this.breadcrumbIcon = 'doc'
      this.getAllDocuments('active', true);
    } else if (this.Breadcrumb == 'Shared with me') {
      this.breadcrumbIcon = 'doc'
      this.getMySharedDocs();
    } else if (this.Breadcrumb == 'Private') {
      this.breadcrumbIcon = 'private'
      this.getMyPrivateDocs();
    } else if (this.Breadcrumb == 'Trash') {
      this.breadcrumbIcon = 'trash'
      this.getAllDocuments('trashed ');
    } else if (this.Breadcrumb == 'Created by me') {
      this.breadcrumbIcon = 'doc'
      this.getAllDocuments('active');
    } else if (this.Breadcrumb == 'My Documents') {
      this.breadcrumbIcon = 'doc'
      this.getAllDocuments('active');
    } else if (this.Breadcrumb == 'Shared with Team') {
      this.breadcrumbIcon = 'share-team'
      // this.Breadcrumb = 'Shared with Team';
      this.getDefaultTeams();
    }

  }

  checkExtensionInstalled() {
    try {
      chrome.runtime.sendMessage('kmaonaglfeahijclhdllebhfhmgfdpbh', {action: 'checkInstalled'}, (response) => {
        if (response) {
          this.extensionInstalled = true;
          // this.getAllTabs({ extensionId: 'kmaonaglfeahijclhdllebhfhmgfdpbh', msg: 'getTabDetails' })
          // The extension is installed.
        } else {
          this.extensionInstalled = false;
          // The extension is not installed.
        }
      });
    } catch (error) {
      console.log(error);
    }

  }

  redirectToChromeStore() {
    window.open("https://chrome.google.com/webstore/detail/kopist-easily-create-how/kmaonaglfeahijclhdllebhfhmgfdpbh");
  }

  checkPermission(data: any, roleId: any) {
    return ((this.matchOwnerId(data, localStorage.getItem('user_id')) && roleId == 2) || roleId == 1 || (this.matchOwnerId(data, localStorage.getItem('user_id')) && roleId == null));
  }

  matchOwnerId(data: any, userId: any) {
    if (data) {
      let user = data.find((u: any) => u.user_id == userId);
      return user ? user.is_owner === "Yes" : false;
    } else {
      return false;
    }
  }


  saveView(view: any) {
    localStorage.setItem('card_view', (view ? 'list' : 'grid'))
    let form = new FormData();
    const name: any = localStorage.getItem('name')
    const lastName: any = localStorage.getItem('last-name')
    form.append('first_name', name)
    form.append('last_name', lastName)
    form.append('card_view', (view ? 'list' : 'grid'))

    this.authService.updateProfile(form).subscribe({
      next: (res) => {

        // this.toastr.success('Profile Updated Successfully');
      },
      error: (err) => {
        this.toasterService.error(err.error.message);

      },
    });
  }


  countDocumentTypeSteps(steps: any): number {
    if (!steps) {
      return 0;
    }
    return steps.filter((step: any) => !step.step_type).length;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
